"""
Stage 2: NDC -> ingredient mapping, and cohort selection.

NDC mapping: DE-SynPUF's PROD_SRVC_ID (NDC) field is disclosure-perturbed by CMS
(see PDE-4 in the codebook: "imputed/suppressed/coarsened as part of disclosure
treatment") and its record-level frequency distribution is far flatter than real-world
drug dispensing -- confirmed empirically before writing this script (the top 20,000 of
268,563 unique NDCs cover only 27% of fills, versus the sharp concentration you'd see
in real claims). Looking up all ~268k codes individually against a drug API is both
impractical and the wrong shape of solution. Instead we go the other direction: build a
target NDC set once (pipeline/_ndc_targets.py, cached at data/raw/ndc_cache.json) from
a fixed list of ~25 chronic-maintenance ingredients via RxNorm, and check PDE rows
against that set with an O(1) hash lookup.

Cohort selection: a beneficiary-ingredient pair enters the cohort only if the
beneficiary is continuously enrolled (Part A + B + D, all 12 months, every year present
in Sample 1) and has >=4 encounter dates in the window, AND that specific ingredient has
>=6 fills for them. The funnel below accounts for every beneficiary dropped at every
step -- this table is rendered in the app, unmodified.
"""
import json
import sys
from pathlib import Path

import polars as pl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import PROCESSED, parse_cms_date, build_encounters, MIN_FILLS, MIN_ENCOUNTERS, RAW


def load_ndc_map() -> pl.DataFrame:
    cache_path = RAW / "ndc_cache.json"
    if not cache_path.exists():
        raise SystemExit(
            "data/raw/ndc_cache.json not found. Run `python pipeline/_ndc_targets.py` first "
            "(it fetches the NDC target set from RxNorm once and caches it)."
        )
    with open(cache_path) as f:
        cache = json.load(f)
    if not cache:
        raise SystemExit("data/raw/ndc_cache.json is empty -- NDC target-set fetch must have failed.")
    rows = [{"PROD_SRVC_ID": ndc, "ingredient": v["ingredient"], "drug_class": v["drug_class"]}
            for ndc, v in cache.items()]
    return pl.DataFrame(rows)


def continuously_enrolled_ids(beneficiary: pl.DataFrame) -> set:
    """A beneficiary is continuously enrolled if they appear in every yearly summary
    file present in Sample 1 (2008, 2009, 2010) with full Part A + Part B + Part D
    coverage (12 months) in each of those years. This is the check the spec calls for
    explicitly: never silently treat disenrollment as a coverage gap -- exclude those
    patients from the cohort instead, up front, and say so in the funnel."""
    years = beneficiary["SUMMARY_YEAR"].unique().sort().to_list()
    full_years = (
        beneficiary
        .with_columns(pl.col("PLAN_CVRG_MOS_NUM").cast(pl.Int64))
        .filter(
            (pl.col("BENE_HI_CVRAGE_TOT_MONS") == 12)
            & (pl.col("BENE_SMI_CVRAGE_TOT_MONS") == 12)
            & (pl.col("PLAN_CVRG_MOS_NUM") == 12)
            & (pl.col("BENE_DEATH_DT").is_null())
        )
    )
    counts = full_years.group_by("DESYNPUF_ID").agg(pl.len().alias("n_full_years"))
    ok = counts.filter(pl.col("n_full_years") == len(years))
    return set(ok["DESYNPUF_ID"].to_list())


def main():
    print("Stage 2: normalize")
    pde = pl.read_parquet(PROCESSED / "pde.parquet")
    beneficiary = pl.read_parquet(PROCESSED / "beneficiary.parquet")
    outpatient = pl.read_parquet(PROCESSED / "outpatient.parquet")
    carrier = pl.read_parquet(PROCESSED / "carrier.parquet")

    funnel = []
    all_ids = set(beneficiary["DESYNPUF_ID"].unique().to_list())
    funnel.append(("all beneficiaries in Sample 1", len(all_ids)))

    enrolled_ids = continuously_enrolled_ids(beneficiary)
    funnel.append(("continuously enrolled (Part A+B+D, 12/12 months, every year, no death)",
                    len(enrolled_ids)))

    encounters = build_encounters(outpatient, carrier)
    enc_counts = encounters.group_by("DESYNPUF_ID").agg(pl.len().alias("n_encounters"))
    enough_encounters = set(
        enc_counts.filter(pl.col("n_encounters") >= MIN_ENCOUNTERS)["DESYNPUF_ID"].to_list()
    )
    step3_ids = enrolled_ids & enough_encounters
    funnel.append((f"...and >= {MIN_ENCOUNTERS} encounter dates in window", len(step3_ids)))

    ndc_map = load_ndc_map()
    pde_mapped = pde.join(ndc_map, on="PROD_SRVC_ID", how="inner")
    pde_cohort_patients = pde_mapped.filter(pl.col("DESYNPUF_ID").is_in(list(step3_ids)))
    any_target_fill_ids = set(pde_cohort_patients["DESYNPUF_ID"].unique().to_list())
    funnel.append(("...and >= 1 fill of a target chronic-maintenance ingredient",
                    len(any_target_fill_ids)))

    fill_counts = (
        pde_cohort_patients
        .group_by(["DESYNPUF_ID", "ingredient", "drug_class"])
        .agg(pl.len().alias("n_fills"))
    )
    cohort = fill_counts.filter(pl.col("n_fills") >= MIN_FILLS)
    funnel.append((f"...and that ingredient has >= {MIN_FILLS} fills for them "
                    "(final cohort, patient-ingredient rows)", cohort.height))

    print("\n=== cohort selection funnel ===")
    for label, n in funnel:
        print(f"  {n:8,d}  {label}")

    cohort_ids = set(cohort["DESYNPUF_ID"].unique().to_list())
    pde_final = pde_mapped.filter(pl.col("DESYNPUF_ID").is_in(list(cohort_ids)))
    encounters_final = encounters.filter(pl.col("DESYNPUF_ID").is_in(list(cohort_ids)))
    beneficiary_final = beneficiary.filter(pl.col("DESYNPUF_ID").is_in(list(cohort_ids)))

    cohort.write_parquet(PROCESSED / "cohort.parquet")
    pde_final.write_parquet(PROCESSED / "pde_mapped.parquet")
    encounters_final.write_parquet(PROCESSED / "encounters.parquet")
    beneficiary_final.write_parquet(PROCESSED / "beneficiary_cohort.parquet")

    funnel_df = pl.DataFrame({"step": [f[0] for f in funnel], "n_beneficiaries": [f[1] for f in funnel]})
    funnel_df.write_parquet(PROCESSED / "funnel.parquet")

    print(f"\n  cohort: {cohort.height} patient-ingredient pairs, "
          f"{len(cohort_ids)} unique beneficiaries")
    by_class = cohort.group_by("drug_class").agg(pl.len().alias("n"))
    print("  by drug class:")
    for row in by_class.iter_rows(named=True):
        print(f"    {row['drug_class']:22s} {row['n']:6,d}")


if __name__ == "__main__":
    main()
