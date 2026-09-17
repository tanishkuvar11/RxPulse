"""
Stage 3: daily coverage series per (patient, ingredient).

For each fill on date d with n days supply, days d..d+n-1 are covered. Early refills are
handled with the standard PDC carry-forward convention: if a refill lands before the
prior supply has run out, its covered days start the day *after* the running supply end,
not on the fill date -- otherwise overlapping supply would double-count days and inflate
adherence.

Days inside an inpatient stay are marked censored, not uncovered: Part D claims do not
capture medication administered during a hospitalization, so an inpatient stay would
otherwise look identical to a missed dose. This is the exact false accusation this
project exists to avoid, so it gets handled here, in the most literal place: the code
that turns fills into a daily series.

Every beneficiary who reaches this stage is continuously enrolled the entire observation
window (see 02_normalize.py's funnel), so the daily series covers all of 2008-01-01
through 2010-12-31 for everyone -- there are no enrollment-gap days to censor here.
"""
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import polars as pl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import PROCESSED, parse_cms_date

OBS_START_D = date(2008, 1, 1)
OBS_END_D = date(2010, 12, 31)
N_DAYS = (OBS_END_D - OBS_START_D).days + 1  # 1096

STATUS_UNCOVERED = 0
STATUS_COVERED = 1
STATUS_CENSORED = 2


def day_index(d: date) -> int:
    return (d - OBS_START_D).days


def build_patient_inpatient_days(inpatient: pl.DataFrame, cohort_ids) -> dict:
    """DESYNPUF_ID -> sorted list of (start_idx, end_idx) day-index spans, inclusive,
    for that patient's inpatient stays (admission through discharge, falling back to
    claim from/thru dates when admission/discharge are missing)."""
    ip = inpatient.filter(pl.col("DESYNPUF_ID").is_in(list(cohort_ids))).select(
        pl.col("DESYNPUF_ID"),
        pl.coalesce([parse_cms_date("CLM_ADMSN_DT"), parse_cms_date("CLM_FROM_DT")]).alias("admit"),
        pl.coalesce([parse_cms_date("NCH_BENE_DSCHRG_DT"), parse_cms_date("CLM_THRU_DT")]).alias("discharge"),
    ).drop_nulls()

    spans = {}
    for row in ip.iter_rows(named=True):
        pid = row["DESYNPUF_ID"]
        a, dch = row["admit"], row["discharge"]
        if dch < a:
            a, dch = dch, a
        a = max(a, OBS_START_D)
        dch = min(dch, OBS_END_D)
        if a > dch:
            continue
        spans.setdefault(pid, []).append((day_index(a), day_index(dch)))
    return spans


def build_series(fills: list[tuple[date, int]], censor_spans: list[tuple[int, int]]) -> np.ndarray:
    """fills: list of (service_date, days_supply), unsorted OK.
    Returns an int8 array of length N_DAYS with STATUS_* values."""
    arr = np.full(N_DAYS, STATUS_UNCOVERED, dtype=np.int8)
    running_end = -1  # last covered day-index so far (carry-forward pointer)
    for d, n in sorted(fills, key=lambda t: t[0]):
        if n is None or n <= 0:
            continue
        fill_idx = day_index(d)
        start_idx = max(fill_idx, running_end + 1)
        end_idx = start_idx + n - 1
        lo, hi = max(start_idx, 0), min(end_idx, N_DAYS - 1)
        if lo <= hi:
            arr[lo:hi + 1] = STATUS_COVERED
        running_end = max(running_end, end_idx)
    for lo, hi in censor_spans:
        lo, hi = max(lo, 0), min(hi, N_DAYS - 1)
        if lo <= hi:
            arr[lo:hi + 1] = STATUS_CENSORED
    return arr


def main():
    print("Stage 3: coverage")
    cohort = pl.read_parquet(PROCESSED / "cohort.parquet")
    pde = pl.read_parquet(PROCESSED / "pde_mapped.parquet")
    inpatient = pl.read_parquet(PROCESSED / "inpatient.parquet")

    cohort_ids = set(cohort["DESYNPUF_ID"].unique().to_list())
    censor_by_patient = build_patient_inpatient_days(inpatient, cohort_ids)

    pde_dated = pde.with_columns(parse_cms_date("SRVC_DT").alias("srvc_date")).select(
        "DESYNPUF_ID", "ingredient", "srvc_date", "DAYS_SUPLY_NUM"
    )

    # Pre-group fills by (patient, ingredient) once -- O(1) lookup per cohort row instead
    # of a full-table scan per pair.
    fills_by_pair: dict[tuple[str, str], list[tuple[date, int]]] = {}
    for pid, ing, d, n in zip(
        pde_dated["DESYNPUF_ID"].to_list(), pde_dated["ingredient"].to_list(),
        pde_dated["srvc_date"].to_list(), pde_dated["DAYS_SUPLY_NUM"].to_list(),
    ):
        fills_by_pair.setdefault((pid, ing), []).append((d, n))

    day_offsets = np.arange(N_DAYS, dtype=np.int32)

    out_ids, out_ingredients, out_offsets, out_status = [], [], [], []
    n_pairs = 0
    for row in cohort.iter_rows(named=True):
        pid, ing = row["DESYNPUF_ID"], row["ingredient"]
        fills = fills_by_pair.get((pid, ing), [])
        censor_spans = censor_by_patient.get(pid, [])
        arr = build_series(fills, censor_spans)

        out_ids.append(np.full(N_DAYS, pid))
        out_ingredients.append(np.full(N_DAYS, ing))
        out_offsets.append(day_offsets)
        out_status.append(arr)
        n_pairs += 1

    coverage = pl.DataFrame({
        "DESYNPUF_ID": np.concatenate(out_ids),
        "ingredient": np.concatenate(out_ingredients),
        "day_offset": np.concatenate(out_offsets),
        "status": np.concatenate(out_status),
    }).with_columns(
        (pl.lit(OBS_START_D) + pl.duration(days=pl.col("day_offset"))).cast(pl.Date).alias("date")
    ).drop("day_offset")
    coverage.write_parquet(PROCESSED / "coverage.parquet")

    print(f"  built daily coverage for {n_pairs} patient-ingredient pairs "
          f"({coverage.height:,} patient-ingredient-days)")

    pcts = coverage.group_by("status").agg(pl.len().alias("n"))
    total = coverage.height
    label = {STATUS_UNCOVERED: "uncovered", STATUS_COVERED: "covered", STATUS_CENSORED: "censored"}
    print("  overall day-status breakdown:")
    for row in pcts.sort("status").iter_rows(named=True):
        print(f"    {label[row['status']]:10s} {row['n']:10,d} ({100 * row['n'] / total:.1f}%)")

    # Terminal sanity check requested by the build plan: print one patient's coverage strip.
    sample = cohort.row(0, named=True)
    strip = coverage.filter(
        (pl.col("DESYNPUF_ID") == sample["DESYNPUF_ID"]) & (pl.col("ingredient") == sample["ingredient"])
    ).sort("date")
    chars = {STATUS_UNCOVERED: ".", STATUS_COVERED: "#", STATUS_CENSORED: "x"}
    strip_str = "".join(chars[s] for s in strip["status"].to_list()[:180])
    print(f"\n  sample coverage strip -- {sample['DESYNPUF_ID']} / {sample['ingredient']} "
          f"(first 180 days, # covered, . uncovered, x censored):")
    print(f"  {strip_str}")


if __name__ == "__main__":
    main()
