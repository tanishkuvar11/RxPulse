"""
Stage 5: adherence archetypes.

Feature-engineer per patient-ingredient, then cluster with a Gaussian mixture (k chosen
by BIC, k <= 6). Clusters are labeled from their feature centroids using a fixed,
inspectable rule table -- never a clinical or moral category, and the centroid profile
that produced each label ships alongside it in the export so the naming can be checked
against the numbers that produced it.
"""
import sys
from datetime import date
from pathlib import Path

import numpy as np
import polars as pl
from scipy import stats as sstats
from sklearn.mixture import GaussianMixture
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import PROCESSED, SEED

OBS_START_D = date(2008, 1, 1)
STATUS_UNCOVERED, STATUS_COVERED, STATUS_CENSORED = 0, 1, 2

FEATURES = [
    "pdc", "n_gaps_ge7", "longest_gap", "gap_skew", "pre_appointment_lift",
    "cv_inter_fill_interval", "linear_trend", "day_of_week_effect",
]


def run_lengths(mask: np.ndarray) -> list[int]:
    """Lengths of contiguous True runs in a boolean array."""
    if mask.sum() == 0:
        return []
    diff = np.diff(np.concatenate([[0], mask.astype(int), [0]]))
    starts = np.where(diff == 1)[0]
    ends = np.where(diff == -1)[0]
    return (ends - starts).tolist()


def features_for_pair(status: np.ndarray, dates: np.ndarray, fill_dates: list[date],
                       pre_appointment_lift: float) -> dict:
    covered = status == STATUS_COVERED
    uncovered = status == STATUS_UNCOVERED
    censored = status == STATUS_CENSORED

    n_censored = int(censored.sum())
    denom = len(status) - n_censored
    pdc = covered.sum() / denom if denom > 0 else np.nan

    gap_lengths = run_lengths(uncovered)
    n_gaps_ge7 = sum(1 for g in gap_lengths if g >= 7)
    longest_gap = max(gap_lengths) if gap_lengths else 0
    gap_skew = float(sstats.skew(gap_lengths)) if len(gap_lengths) >= 3 else 0.0

    if len(fill_dates) >= 3:
        sorted_fills = sorted(fill_dates)
        intervals = np.diff([(d - OBS_START_D).days for d in sorted_fills])
        intervals = intervals[intervals > 0]
        cv = float(np.std(intervals) / np.mean(intervals)) if len(intervals) and np.mean(intervals) > 0 else 0.0
    else:
        cv = 0.0

    day_idx = np.arange(len(status))
    valid = ~censored
    if valid.sum() > 10:
        slope = sstats.linregress(day_idx[valid], covered[valid].astype(float)).slope
    else:
        slope = 0.0

    weekday = np.array([(OBS_START_D.weekday() + i) % 7 for i in range(len(status))])
    dow_means = []
    for wd in range(7):
        m = valid & (weekday == wd)
        if m.sum() > 0:
            dow_means.append(covered[m].mean())
    dow_effect = float(np.std(dow_means)) if len(dow_means) == 7 else 0.0

    return {
        "pdc": pdc, "n_gaps_ge7": n_gaps_ge7, "longest_gap": longest_gap, "gap_skew": gap_skew,
        "pre_appointment_lift": pre_appointment_lift, "cv_inter_fill_interval": cv,
        "linear_trend": slope, "day_of_week_effect": dow_effect,
    }


def label_cluster(z_centroid: dict) -> str:
    """Rule-based label from a cluster's z-scored feature centroid. Picks the 1-2 most
    extreme features and renders a plain description -- never a clinical/moral term."""
    ranked = sorted(z_centroid.items(), key=lambda kv: -abs(kv[1]))
    phrases = []
    for feat, z in ranked[:2]:
        if abs(z) < 0.4:
            continue
        sign = "high" if z > 0 else "low"
        phrase = {
            ("pdc", "high"): "high overall coverage",
            ("pdc", "low"): "low overall coverage",
            ("n_gaps_ge7", "high"): "frequent week-plus gaps",
            ("n_gaps_ge7", "low"): "rare week-plus gaps",
            ("longest_gap", "high"): "one long gap",
            ("longest_gap", "low"): "no long gap",
            ("gap_skew", "high"): "gaps concentrated in a few episodes",
            ("gap_skew", "low"): "gaps spread evenly",
            ("pre_appointment_lift", "high"): "pre-visit concentrated",
            ("pre_appointment_lift", "low"): "no pre-visit pattern",
            ("cv_inter_fill_interval", "high"): "irregular refill timing",
            ("cv_inter_fill_interval", "low"): "regular refill timing",
            ("linear_trend", "high"): "improving over time",
            ("linear_trend", "low"): "declining over time",
            ("day_of_week_effect", "high"): "day-of-week pattern",
            ("day_of_week_effect", "low"): "no day-of-week pattern",
        }.get((feat, sign))
        if phrase:
            phrases.append(phrase)
    return ", ".join(phrases) if phrases else "no strong distinguishing feature"


def main():
    print("Stage 5: archetypes")
    coverage = pl.read_parquet(PROCESSED / "coverage.parquet")
    pde = pl.read_parquet(PROCESSED / "pde_mapped.parquet")
    per_patient_lift = pl.read_parquet(PROCESSED / "per_patient_lift.parquet")
    from common import parse_cms_date
    pde_dated = pde.with_columns(parse_cms_date("SRVC_DT").alias("srvc_date"))

    lift_by_pair = {
        (r["DESYNPUF_ID"], r["ingredient"]): r["pre_appointment_lift"]
        for r in per_patient_lift.iter_rows(named=True)
    }

    rows = []
    keys = []
    for (pid, ing), grp in coverage.sort("date").group_by(["DESYNPUF_ID", "ingredient"]):
        status = grp["status"].to_numpy()
        dates = grp["date"].to_numpy()
        fill_dates = pde_dated.filter(
            (pl.col("DESYNPUF_ID") == pid) & (pl.col("ingredient") == ing)
        )["srvc_date"].to_list()
        lift = lift_by_pair.get((pid, ing), 0.0)
        feats = features_for_pair(status, dates, fill_dates, lift if lift is not None else 0.0)
        rows.append(feats)
        keys.append((pid, ing))

    feat_df = pl.DataFrame(rows)
    X = feat_df.select(FEATURES).fill_null(0.0).to_numpy()
    X = np.nan_to_num(X, nan=0.0)
    scaler = StandardScaler()
    Xz = scaler.fit_transform(X)

    best_gmm, best_bic, best_k = None, np.inf, 1
    for k in range(2, min(6, len(X) - 1) + 1) if len(X) > 3 else []:
        gmm = GaussianMixture(n_components=k, random_state=SEED, n_init=3)
        gmm.fit(Xz)
        bic = gmm.bic(Xz)
        if bic < best_bic:
            best_bic, best_gmm, best_k = bic, gmm, k

    if best_gmm is None:
        print("  cohort too small for clustering; skipping archetype assignment.")
        labels = np.zeros(len(X), dtype=int)
        centroids_z = np.zeros((1, len(FEATURES)))
    else:
        labels = best_gmm.predict(Xz)
        centroids_z = best_gmm.means_
        print(f"  chose k={best_k} clusters by BIC ({best_bic:.1f})")

    cluster_labels = {}
    cluster_centroid_raw = {}
    for c in range(centroids_z.shape[0]):
        z_centroid = dict(zip(FEATURES, centroids_z[c]))
        cluster_labels[c] = label_cluster(z_centroid)
        mask = labels == c
        cluster_centroid_raw[c] = {f: float(np.mean(X[mask, i])) if mask.sum() else 0.0
                                    for i, f in enumerate(FEATURES)}

    out_rows = []
    for i, (pid, ing) in enumerate(keys):
        c = int(labels[i])
        row = {"DESYNPUF_ID": pid, "ingredient": ing, "cluster": c,
               "cluster_label": cluster_labels[c]}
        row.update({f"feat_{f}": rows[i][f] for f in FEATURES})
        out_rows.append(row)
    pl.DataFrame(out_rows).write_parquet(PROCESSED / "archetypes.parquet")

    centroid_rows = [{"cluster": c, "label": cluster_labels[c], **{f"feat_{f}": v for f, v in centroid.items()}}
                      for c, centroid in cluster_centroid_raw.items()]
    pl.DataFrame(centroid_rows).write_parquet(PROCESSED / "archetype_centroids.parquet")

    print(f"  {len(out_rows)} patient-ingredient pairs assigned to {len(cluster_labels)} archetypes:")
    for c, label in cluster_labels.items():
        n = int((labels == c).sum())
        print(f"    cluster {c}: {label}  (n={n})")


if __name__ == "__main__":
    main()
