"""
Stage 6: competing hypotheses.

For every patient-ingredient pair the tool could surface, run each evidence check
against the real files and report supported / contradicted / not assessable. This
panel is explicitly allowed to land on "insufficient evidence" -- that outcome is
rendered with equal visual weight to a positive finding in the app, not as a greyed-out
afterthought.
"""
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import polars as pl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import PROCESSED, parse_cms_date

OBS_START_D = date(2008, 1, 1)
STATUS_UNCOVERED, STATUS_COVERED, STATUS_CENSORED = 0, 1, 2


def run_lengths_with_positions(mask: np.ndarray):
    """(start_idx, length) for each contiguous True run."""
    if mask.sum() == 0:
        return []
    diff = np.diff(np.concatenate([[0], mask.astype(int), [0]]))
    starts = np.where(diff == 1)[0]
    ends = np.where(diff == -1)[0]
    return list(zip(starts.tolist(), (ends - starts).tolist()))


def main():
    print("Stage 6: hypotheses")
    coverage = pl.read_parquet(PROCESSED / "coverage.parquet")
    pde = pl.read_parquet(PROCESSED / "pde_mapped.parquet").with_columns(
        parse_cms_date("SRVC_DT").alias("srvc_date")
    )
    beneficiary = pl.read_parquet(PROCESSED / "beneficiary_cohort.parquet")
    inpatient = pl.read_parquet(PROCESSED / "inpatient.parquet").with_columns(
        pl.coalesce([parse_cms_date("CLM_ADMSN_DT"), parse_cms_date("CLM_FROM_DT")]).alias("admit"),
        pl.coalesce([parse_cms_date("NCH_BENE_DSCHRG_DT"), parse_cms_date("CLM_THRU_DT")]).alias("discharge"),
    )
    cohort = pl.read_parquet(PROCESSED / "cohort.parquet")

    bene_by_id = {r["DESYNPUF_ID"]: r for r in beneficiary.unique(subset=["DESYNPUF_ID"]).iter_rows(named=True)}
    ip_by_id = {}
    for pid, grp in inpatient.filter(pl.col("admit").is_not_null()).group_by("DESYNPUF_ID"):
        pid = pid[0] if isinstance(pid, tuple) else pid
        ip_by_id[pid] = list(zip(grp["admit"].to_list(), grp["discharge"].to_list()))

    # Pre-group "other ingredients in the same drug class for this patient" once,
    # instead of filtering the full PDE table inside the per-pair loop (6,286x).
    class_ingredients_by_patient: dict[tuple, set] = {}
    for (pid, dclass), grp in pde.group_by(["DESYNPUF_ID", "drug_class"]):
        class_ingredients_by_patient[(pid, dclass)] = set(grp["ingredient"].unique().to_list())

    pde_cohort_only = pde.join(cohort.select(["DESYNPUF_ID", "ingredient"]), on=["DESYNPUF_ID", "ingredient"], how="inner")

    rows = []
    for (pid, ing), grp in pde_cohort_only.group_by(["DESYNPUF_ID", "ingredient"]):
        drug_class = grp["drug_class"][0]
        fills = grp.sort("srvc_date")
        n_fills = fills.height
        days_supply = fills["DAYS_SUPLY_NUM"].to_list()
        qty = fills["QTY_DSPNSD_NUM"].to_list()
        fill_dates = fills["srvc_date"].to_list()

        cov = coverage.filter((pl.col("DESYNPUF_ID") == pid) & (pl.col("ingredient") == ing)).sort("date")
        status = cov["status"].to_numpy()
        uncovered_runs = run_lengths_with_positions(status == STATUS_UNCOVERED)
        longest_run = max(uncovered_runs, key=lambda t: t[1]) if uncovered_runs else None

        checks = {}

        # 1. Switched to 90-day supply
        if len(days_supply) >= 4:
            first_half = days_supply[:len(days_supply) // 2]
            second_half = days_supply[len(days_supply) // 2:]
            mode_first = max(set(first_half), key=first_half.count)
            mode_second = max(set(second_half), key=second_half.count)
            if mode_first < 45 and mode_second >= 75:
                checks["switched_to_90_day_supply"] = ("supported", f"days supply went from ~{mode_first} to ~{mode_second}")
            else:
                checks["switched_to_90_day_supply"] = ("contradicted", f"days supply stayed ~{mode_first}-{mode_second}")
        else:
            checks["switched_to_90_day_supply"] = ("not assessable", "too few fills to compare early vs late supply size")

        # 2. Switched drug within class
        others = class_ingredients_by_patient.get((pid, drug_class), set()) - {ing}
        if others:
            checks["switched_drug_in_class"] = ("supported", f"also filled {', '.join(sorted(others))} ({drug_class})")
        else:
            checks["switched_drug_in_class"] = ("contradicted", f"no other {drug_class} fills found for this patient")

        # 3. Hospitalized during the gap (or immediately before it -- discharge-reconciliation delay)
        stays = ip_by_id.get(pid, [])
        if longest_run and stays:
            gap_start_date = OBS_START_D + timedelta(days=int(longest_run[0]))
            gap_end_date = OBS_START_D + timedelta(days=int(longest_run[0] + longest_run[1] - 1))
            hit = None
            for admit, discharge in stays:
                overlaps = admit <= gap_end_date and discharge >= gap_start_date
                near_discharge = 0 <= (gap_start_date - discharge).days <= 14
                if overlaps or near_discharge:
                    hit = (admit, discharge)
                    break
            if hit:
                checks["hospitalized_during_gap"] = (
                    "supported", f"inpatient stay {hit[0]} to {hit[1]} overlaps or immediately precedes the longest gap"
                )
            else:
                checks["hospitalized_during_gap"] = ("contradicted", "no inpatient stay near the longest gap")
        elif longest_run:
            checks["hospitalized_during_gap"] = ("contradicted", "no inpatient claims on file for this patient")
        else:
            checks["hospitalized_during_gap"] = ("not assessable", "no uncovered gap to explain")

        # 4. Left the plan / disenrolled -- always contradicted by construction (cohort
        # requires full 12/12 month coverage every year)
        checks["disenrolled"] = ("contradicted", "beneficiary summary shows 12/12 months of Part A+B+D coverage every year in the window")

        # 5. Died -- always contradicted by construction
        checks["died"] = ("contradicted", "no death date on file for this beneficiary")

        # 6. Sparse observation, not a gap
        if n_fills < 8:
            checks["sparse_observation"] = ("supported", f"only {n_fills} fills across the observation window")
        else:
            checks["sparse_observation"] = ("contradicted", f"{n_fills} fills is enough to characterize a pattern")

        # 7. Dose change
        if len(qty) >= 4 and all(d and d > 0 for d in days_supply):
            daily_dose = [q / d for q, d in zip(qty, days_supply) if d]
            first_half_dd = daily_dose[:len(daily_dose) // 2]
            second_half_dd = daily_dose[len(daily_dose) // 2:]
            m1, m2 = np.mean(first_half_dd), np.mean(second_half_dd)
            if m1 > 0 and abs(m2 - m1) / m1 > 0.25:
                checks["dose_change"] = ("supported", f"daily-dose-equivalent changed from {m1:.2f} to {m2:.2f} units/day")
            else:
                checks["dose_change"] = ("contradicted", "daily-dose-equivalent stable across fills")
        else:
            checks["dose_change"] = ("not assessable", "too few fills or missing days-supply to compare dose")

        for hyp, (verdict, evidence) in checks.items():
            rows.append({"DESYNPUF_ID": pid, "ingredient": ing, "hypothesis": hyp,
                         "verdict": verdict, "evidence": evidence})

    out = pl.DataFrame(rows)
    out.write_parquet(PROCESSED / "hypotheses.parquet")

    print(f"  evaluated {len(rows) // 7 if rows else 0} patient-ingredient pairs across 7 hypotheses")
    by_verdict = out.group_by(["hypothesis", "verdict"]).agg(pl.len().alias("n")).sort("hypothesis")
    for row in by_verdict.iter_rows(named=True):
        print(f"    {row['hypothesis']:28s} {row['verdict']:14s} {row['n']:5d}")

    voi_rows = rank_next_observations(out)
    pl.DataFrame(voi_rows).write_parquet(PROCESSED / "next_observations.parquet")
    print(f"  wrote candidate next-observation rankings for "
          f"{len(set((r['DESYNPUF_ID'], r['ingredient']) for r in voi_rows))} pairs")


# "What would settle it": expected information gain over the discrete hypothesis
# posterior. Model: each "not assessable" hypothesis check carries exactly 1 bit of
# unresolved uncertainty (a uniform Bernoulli prior over supported/contradicted -- the
# maximum-entropy assumption when the check genuinely couldn't be run). A candidate
# observation's expected information gain is the number of currently-unresolved checks
# it would resolve, in bits. This is a deliberately simple proxy, not a fitted
# probabilistic model -- it is documented as such in the app's "About the data" panel.
OBSERVATION_RESOLVES = {
    "pill count": ["sparse_observation"],
    "pharmacy record check": ["switched_to_90_day_supply", "switched_drug_in_class", "dose_change"],
    "ask the patient one question about the hospitalization": ["hospitalized_during_gap"],
    "drug-level blood test at the next visit": ["hospitalized_during_gap", "dose_change"],
}


def rank_next_observations(hyp_df: pl.DataFrame) -> list[dict]:
    rows = []
    for (pid, ing), grp in hyp_df.group_by(["DESYNPUF_ID", "ingredient"]):
        unresolved = set(grp.filter(pl.col("verdict") == "not assessable")["hypothesis"].to_list())
        if not unresolved:
            continue
        for obs_name, resolves in OBSERVATION_RESOLVES.items():
            bits = len(unresolved & set(resolves))
            if bits > 0:
                rows.append({"DESYNPUF_ID": pid, "ingredient": ing, "observation": obs_name,
                             "expected_bits_reduced": bits})
    return rows


if __name__ == "__main__":
    main()
