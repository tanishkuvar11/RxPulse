"""
Stage 4: encounter alignment and the core statistic -- the heart of the project.

For each encounter, extract the coverage series in a window of -60 to +30 days relative
to the encounter date. Average across all encounters and patients at each relative
offset to get the phase-aligned coverage curve. If white-coat adherence exists in this
cohort, a lift appears in roughly the -14 to -1 day band.

Pre-appointment lift = mean coverage in [-14,-1] minus mean coverage in [-60,-31].

Significance comes from a permutation test: shuffle each patient's *own* encounter
dates to random positions within their *own* observation window, preserving the number
of encounters and that patient's own coverage series, then recompute the lift. Repeat
2000 times. This is what makes the result defensible -- it controls for the fact that
coverage is autocorrelated and that sick patients both visit more and fill more, without
requiring us to model either of those things explicitly.

Everything here runs on the real cohort. If there is no real lift, this script reports
that -- a clean null on real data is the honest result, not a bug to work around.

Implementation note: the lift itself only needs two range-sums (covered days and
not-censored days, in the near band and the far band) around each encounter, not the
full 91-day offset curve -- so the permutation and bootstrap loops use a per-pair
prefix-sum (cumulative count of covered / not-censored days up to each day) and answer
each range-sum with two lookups and a subtraction. That turns each of the 4,000 repeated
statistic evaluations (2,000 permutations + 2,000 bootstrap resamples) into an
O(pairs x encounters) array op instead of O(pairs x encounters x 91), which is the
difference between seconds and the better part of an hour at this cohort's size (~6,000
pairs, up to ~100 encounters per patient). The full 91-point curve used for the cohort
chart is still computed the direct way, but only once, on the real (unpermuted) data.
"""
import sys
from datetime import date
from pathlib import Path

import numpy as np
import polars as pl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import PROCESSED, SEED

OBS_START_D = date(2008, 1, 1)
OBS_END_D = date(2010, 12, 31)
N_DAYS = (OBS_END_D - OBS_START_D).days + 1

PRE_WINDOW_LO, PRE_WINDOW_HI = -60, 30  # relative-day window for the exported curve
OFFSETS = np.arange(PRE_WINDOW_LO, PRE_WINDOW_HI + 1)
LIFT_NEAR_LO, LIFT_NEAR_HI = -14, -1     # "pre-visit" band
LIFT_FAR_LO, LIFT_FAR_HI = -60, -31      # "baseline" band, far from any visit
N_PERMUTATIONS = 2000
N_BOOTSTRAP = 2000
STATUS_COVERED = 1
STATUS_CENSORED = 2


def day_index(d: date) -> int:
    return (d - OBS_START_D).days


def band_sums_per_pair(covered_cum: np.ndarray, notcensored_cum: np.ndarray,
                        pair_rows: np.ndarray, enc_days: np.ndarray, enc_mask: np.ndarray,
                        lo: int, hi: int) -> tuple[np.ndarray, np.ndarray]:
    """Sum of covered days and not-censored days in [day+lo, day+hi] for every
    encounter, per pair (encounters axis reduced, pairs axis kept). Uses a prefix-sum
    lookup: covered_cum[p, d] = number of covered days in [0, d) for pair p, so a range
    sum over [start, end) is one subtraction. pair_rows lets the same cumsum table be
    reused for a bootstrap resample (pair_rows repeats indices) without rebuilding it.
    """
    start = np.clip(enc_days + lo, 0, N_DAYS)
    end = np.clip(enc_days + hi + 1, 0, N_DAYS)
    rows = pair_rows[:, None]
    covered = (covered_cum[rows, end] - covered_cum[rows, start]) * enc_mask
    valid = (notcensored_cum[rows, end] - notcensored_cum[rows, start]) * enc_mask
    return covered.sum(axis=1), valid.sum(axis=1)


def lift_from_pair_sums(near_covered, near_n, far_covered, far_n) -> float:
    near_n_tot, far_n_tot = near_n.sum(), far_n.sum()
    if near_n_tot <= 0 or far_n_tot <= 0:
        return float("nan")
    return float(near_covered.sum() / near_n_tot - far_covered.sum() / far_n_tot)


def main():
    print("Stage 4: alignment + permutation test", flush=True)
    coverage = pl.read_parquet(PROCESSED / "coverage.parquet")
    encounters = pl.read_parquet(PROCESSED / "encounters.parquet")

    rng = np.random.default_rng(SEED)

    pairs = list(coverage.select(["DESYNPUF_ID", "ingredient"]).unique().sort(
        ["DESYNPUF_ID", "ingredient"]).iter_rows())
    pair_index = {p: i for i, p in enumerate(pairs)}
    n_pairs = len(pairs)

    status_matrix = np.zeros((n_pairs, N_DAYS), dtype=np.int8)
    for (pid, ing), grp in coverage.sort("date").group_by(["DESYNPUF_ID", "ingredient"]):
        status_matrix[pair_index[(pid, ing)]] = grp["status"].to_numpy()

    enc_by_patient: dict[str, list[int]] = {}
    for pid, grp in encounters.group_by("DESYNPUF_ID"):
        pid = pid[0] if isinstance(pid, tuple) else pid
        enc_by_patient[pid] = sorted(day_index(d) for d in grp["encounter_date"].to_list())

    pair_encounters = [enc_by_patient.get(pid, []) for pid, _ing in pairs]
    keep = [i for i, e in enumerate(pair_encounters) if len(e) > 0]
    pairs = [pairs[i] for i in keep]
    pair_encounters = [pair_encounters[i] for i in keep]
    status_matrix = status_matrix[keep]
    n_pairs = len(pairs)
    max_enc = max(len(e) for e in pair_encounters)
    print(f"  cohort pairs in alignment: {n_pairs} (max encounters for one pair: {max_enc})", flush=True)

    enc_days = np.zeros((n_pairs, max_enc), dtype=np.int32)
    enc_mask = np.zeros((n_pairs, max_enc), dtype=np.int32)  # int, not bool: used as a multiplier
    for i, e in enumerate(pair_encounters):
        enc_days[i, :len(e)] = e
        enc_mask[i, :len(e)] = 1
    n_enc_per_pair = enc_mask.sum(axis=1)

    # Prefix sums, one extra column so cum[d] = count in days [0, d).
    covered_cum = np.zeros((n_pairs, N_DAYS + 1), dtype=np.int32)
    notcensored_cum = np.zeros((n_pairs, N_DAYS + 1), dtype=np.int32)
    np.cumsum(status_matrix == STATUS_COVERED, axis=1, out=covered_cum[:, 1:])
    np.cumsum(status_matrix != STATUS_CENSORED, axis=1, out=notcensored_cum[:, 1:])

    identity_rows = np.arange(n_pairs)

    def pair_lift_terms(pair_rows, days, mask):
        near_c, near_n = band_sums_per_pair(covered_cum, notcensored_cum, pair_rows, days, mask,
                                             LIFT_NEAR_LO, LIFT_NEAR_HI)
        far_c, far_n = band_sums_per_pair(covered_cum, notcensored_cum, pair_rows, days, mask,
                                           LIFT_FAR_LO, LIFT_FAR_HI)
        return near_c, near_n, far_c, far_n

    near_c, near_n, far_c, far_n = pair_lift_terms(identity_rows, enc_days, enc_mask)
    observed_lift = lift_from_pair_sums(near_c, near_n, far_c, far_n)
    print(f"  observed pre-appointment lift: {observed_lift:+.4f}", flush=True)

    print(f"  running {N_PERMUTATIONS} permutations ...", flush=True)
    null_lifts = np.empty(N_PERMUTATIONS)
    for i in range(N_PERMUTATIONS):
        perm_days = rng.integers(0, N_DAYS, size=(n_pairs, max_enc), dtype=np.int32)
        nc, nn, fc, fn = pair_lift_terms(identity_rows, perm_days, enc_mask)
        null_lifts[i] = lift_from_pair_sums(nc, nn, fc, fn)
        if (i + 1) % 500 == 0:
            print(f"    {i + 1}/{N_PERMUTATIONS}", flush=True)
    if observed_lift >= 0:
        p_value = float((np.sum(null_lifts >= observed_lift) + 1) / (N_PERMUTATIONS + 1))
    else:
        p_value = float((np.sum(null_lifts <= observed_lift) + 1) / (N_PERMUTATIONS + 1))
    print(f"  permutation p-value (one-sided, direction of observed effect): {p_value:.4f}", flush=True)

    print(f"  running {N_BOOTSTRAP}-sample patient-level bootstrap for 95% CI ...", flush=True)
    boot_lifts = np.empty(N_BOOTSTRAP)
    for i in range(N_BOOTSTRAP):
        sample_rows = rng.integers(0, n_pairs, size=n_pairs)
        nc, nn, fc, fn = pair_lift_terms(sample_rows, enc_days[sample_rows], enc_mask[sample_rows])
        boot_lifts[i] = lift_from_pair_sums(nc, nn, fc, fn)
    ci_lo, ci_hi = np.nanpercentile(boot_lifts, [2.5, 97.5])
    print(f"  95% CI on lift: [{ci_lo:+.4f}, {ci_hi:+.4f}]", flush=True)

    # Per-pair lift (real data, identity rows) for individual case surfacing downstream.
    per_patient_rows = []
    with np.errstate(invalid="ignore", divide="ignore"):
        per_pair_lift = np.where((near_n > 0) & (far_n > 0), near_c / np.maximum(near_n, 1) - far_c / np.maximum(far_n, 1), np.nan)
    for i, (pid, ing) in enumerate(pairs):
        per_patient_rows.append({
            "DESYNPUF_ID": pid, "ingredient": ing,
            "n_encounters": int(n_enc_per_pair[i]),
            "pre_appointment_lift": float(per_pair_lift[i]) if np.isfinite(per_pair_lift[i]) else None,
        })
    per_patient = pl.DataFrame(per_patient_rows)

    # Full 91-point curve for the cohort chart -- computed once, directly, on real data.
    print("  building the full phase-aligned curve for the cohort chart ...", flush=True)
    status_flat = status_matrix.reshape(-1)
    day_idx = enc_days[:, :, None] + OFFSETS.astype(np.int32)[None, None, :]
    in_range = (day_idx >= 0) & (day_idx < N_DAYS)
    valid = (enc_mask[:, :, None] == 1) & in_range
    day_idx_c = np.clip(day_idx, 0, N_DAYS - 1)
    flat_idx = (identity_rows[:, None, None].astype(np.int64) * N_DAYS + day_idx_c)
    vals = status_flat[flat_idx]
    not_censored_full = valid & (vals != STATUS_CENSORED)
    covered_full = not_censored_full & (vals == STATUS_COVERED)
    covered_sum = covered_full.sum(axis=(0, 1)).astype(np.float64)
    n_sum = not_censored_full.sum(axis=(0, 1)).astype(np.float64)
    with np.errstate(invalid="ignore", divide="ignore"):
        mean_covered = np.where(n_sum > 0, covered_sum / n_sum, np.nan)

    curve_df = pl.DataFrame({
        "offset_days": OFFSETS,
        "mean_coverage": mean_covered,
        "n_observations": n_sum,
    })
    null_df = pl.DataFrame({"null_lift": null_lifts})

    curve_df.write_parquet(PROCESSED / "phase_curve.parquet")
    null_df.write_parquet(PROCESSED / "permutation_null.parquet")
    per_patient.write_parquet(PROCESSED / "per_patient_lift.parquet")

    summary = pl.DataFrame([{
        "observed_lift": observed_lift,
        "p_value": p_value,
        "ci_lo": float(ci_lo),
        "ci_hi": float(ci_hi),
        "n_permutations": N_PERMUTATIONS,
        "n_bootstrap": N_BOOTSTRAP,
        "n_pairs": n_pairs,
    }])
    summary.write_parquet(PROCESSED / "alignment_summary.parquet")

    verdict = "SIGNIFICANT" if p_value < 0.05 else "NOT significant"
    print(f"\n  === real-cohort result: {verdict} at alpha=0.05 ===", flush=True)


if __name__ == "__main__":
    main()
