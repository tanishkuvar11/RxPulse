"""
Stage 1: download (if not already cached) + load + basic validation.

Idempotent: if data/raw/<file> already exists, the download is skipped. This is what
makes `make all` safe to re-run -- everything downloads once into data/raw/, and every
run after that reads the cached copy. No network call happens once data/raw/ is populated.

Writes one parquet file per source table into data/processed/, and prints a row-count /
column-presence validation table -- the first honesty check in the pipeline.
"""
import sys
import zipfile
from pathlib import Path

import polars as pl
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import RAW, PROCESSED

FILES = {
    "de1_0_2008_beneficiary_summary_file_sample_1.zip":
        "https://www.cms.gov/research-statistics-data-and-systems/downloadable-public-use-files/synpufs/downloads/de1_0_2008_beneficiary_summary_file_sample_1.zip",
    "de1_0_2009_beneficiary_summary_file_sample_1.zip":
        "https://www.cms.gov/research-statistics-data-and-systems/downloadable-public-use-files/synpufs/downloads/de1_0_2009_beneficiary_summary_file_sample_1.zip",
    "de1_0_2010_beneficiary_summary_file_sample_1.zip":
        "https://www.cms.gov/research-statistics-data-and-systems/statistics-trends-and-reports/synpufs/downloads/de1_0_2010_beneficiary_summary_file_sample_20.zip",
    "DE1_0_2008_to_2010_Inpatient_Claims_Sample_1.zip":
        "https://www.cms.gov/research-statistics-data-and-systems/downloadable-public-use-files/synpufs/downloads/de1_0_2008_to_2010_inpatient_claims_sample_1.zip",
    "DE1_0_2008_to_2010_Outpatient_Claims_Sample_1.zip":
        "https://www.cms.gov/research-statistics-data-and-systems/downloadable-public-use-files/synpufs/downloads/de1_0_2008_to_2010_outpatient_claims_sample_1.zip",
    "DE1_0_2008_to_2010_Carrier_Claims_Sample_1A.zip":
        "https://downloads.cms.gov/files/DE1_0_2008_to_2010_Carrier_Claims_Sample_1A.zip",
    "DE1_0_2008_to_2010_Carrier_Claims_Sample_1B.zip":
        "https://downloads.cms.gov/files/DE1_0_2008_to_2010_Carrier_Claims_Sample_1B.zip",
    "DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.zip":
        "https://downloads.cms.gov/files/DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.zip",
}


def ensure_downloaded():
    RAW.mkdir(parents=True, exist_ok=True)
    for fname, url in FILES.items():
        dest = RAW / fname
        if dest.exists():
            continue
        print(f"  downloading {fname} ...")
        r = requests.get(url, stream=True, timeout=120)
        r.raise_for_status()
        tmp = dest.with_suffix(".part")
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 20):
                f.write(chunk)
        tmp.rename(dest)


def ensure_extracted():
    for fname in FILES:
        zpath = RAW / fname
        with zipfile.ZipFile(zpath) as z:
            for member in z.namelist():
                target = RAW / member
                if not target.exists():
                    print(f"  extracting {member} ...")
                    z.extract(member, RAW)


PDE_SCHEMA = {"PROD_SRVC_ID": pl.Utf8}
BENE_SCHEMA = {"SP_STATE_CODE": pl.Utf8, "BENE_COUNTY_CD": pl.Utf8, "PLAN_CVRG_MOS_NUM": pl.Utf8}

# Diagnosis/procedure/provider code columns can contain letters (V-codes, E-codes,
# alpha provider numbers) -- force these to string so polars doesn't mis-infer i64.
_ALPHANUMERIC_PATTERNS = ("ICD9_", "ADMTNG_", "HCPCS_", "DRG_CD", "PRVDR_NUM",
                           "TAX_NUM", "PRCSG_IND_CD", "PHYSN_NPI")


def claims_schema_overrides(csv_path):
    import csv
    with open(csv_path, newline="") as f:
        header = next(csv.reader(f))
    return {c: pl.Utf8 for c in header if any(p in c for p in _ALPHANUMERIC_PATTERNS)}


def load_and_validate():
    tables = {}

    pde = pl.read_csv(RAW / "DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv",
                       schema_overrides=PDE_SCHEMA)
    tables["pde"] = pde

    bene_frames = []
    for year in (2008, 2009, 2010):
        f = pl.read_csv(RAW / f"DE1_0_{year}_Beneficiary_Summary_File_Sample_1.csv",
                         schema_overrides=BENE_SCHEMA)
        f = f.with_columns(pl.lit(year).alias("SUMMARY_YEAR"))
        bene_frames.append(f)
    tables["beneficiary"] = pl.concat(bene_frames, how="vertical_relaxed")

    ip_path = RAW / "DE1_0_2008_to_2010_Inpatient_Claims_Sample_1.csv"
    tables["inpatient"] = pl.read_csv(ip_path, schema_overrides=claims_schema_overrides(ip_path))
    op_path = RAW / "DE1_0_2008_to_2010_Outpatient_Claims_Sample_1.csv"
    tables["outpatient"] = pl.read_csv(op_path, schema_overrides=claims_schema_overrides(op_path))
    car_a_path = RAW / "DE1_0_2008_to_2010_Carrier_Claims_Sample_1A.csv"
    car_b_path = RAW / "DE1_0_2008_to_2010_Carrier_Claims_Sample_1B.csv"
    car_overrides = claims_schema_overrides(car_a_path)
    carrier_a = pl.read_csv(car_a_path, schema_overrides=car_overrides)
    carrier_b = pl.read_csv(car_b_path, schema_overrides=car_overrides)
    tables["carrier"] = pl.concat([carrier_a, carrier_b], how="vertical_relaxed")

    required_cols = {
        "pde": ["DESYNPUF_ID", "SRVC_DT", "PROD_SRVC_ID", "DAYS_SUPLY_NUM", "QTY_DSPNSD_NUM"],
        "beneficiary": ["DESYNPUF_ID", "BENE_BIRTH_DT", "BENE_DEATH_DT", "SP_STATE_CODE",
                         "SP_CHF", "SP_DIABETES", "PLAN_CVRG_MOS_NUM"],
        "inpatient": ["DESYNPUF_ID", "CLM_ADMSN_DT", "NCH_BENE_DSCHRG_DT", "CLM_FROM_DT", "CLM_THRU_DT"],
        "outpatient": ["DESYNPUF_ID", "CLM_FROM_DT", "CLM_THRU_DT"],
        "carrier": ["DESYNPUF_ID", "CLM_FROM_DT", "CLM_THRU_DT"],
    }

    print("\n=== 01_ingest validation ===")
    print(f"{'table':12s} {'rows':>12s} {'columns':>8s}  missing required columns")
    for name, df in tables.items():
        missing = [c for c in required_cols[name] if c not in df.columns]
        print(f"{name:12s} {df.height:12,d} {df.width:8d}  {missing if missing else '(none)'}")
        if missing:
            raise SystemExit(f"FATAL: {name} is missing required columns {missing}")
        null_id = df["DESYNPUF_ID"].null_count()
        if null_id:
            raise SystemExit(f"FATAL: {name} has {null_id} null DESYNPUF_ID")

    return tables


def main():
    print("Stage 1: ingest")
    ensure_downloaded()
    ensure_extracted()
    tables = load_and_validate()
    for name, df in tables.items():
        out = PROCESSED / f"{name}.parquet"
        df.write_parquet(out)
        print(f"  wrote {out} ({df.height:,} rows)")


if __name__ == "__main__":
    main()
