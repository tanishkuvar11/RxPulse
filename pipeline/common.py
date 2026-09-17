"""Shared paths, constants and small helpers used across the pipeline."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
APP_DATA = ROOT / "app" / "public" / "data"

SEED = 20260912  # fixed seed for every stochastic step in this pipeline; never re-rolled

# Observation window covered by DE-SynPUF Sample 1 (three linked years of claims)
OBS_START = "2008-01-01"
OBS_END = "2010-12-31"

# Cohort thresholds (see README for rationale)
MIN_FILLS = 6
MIN_ENCOUNTERS = 4

for d in (PROCESSED, APP_DATA):
    d.mkdir(parents=True, exist_ok=True)


def parse_cms_date(col):
    """CMS dates are integers in YYYYMMDD format (or null). Parse to a polars Date."""
    import polars as pl
    return (
        pl.col(col).cast(pl.Utf8)
        .str.strptime(pl.Date, "%Y%m%d", strict=False)
    )


def build_encounters(outpatient: "pl.DataFrame", carrier: "pl.DataFrame") -> "pl.DataFrame":
    """Pool outpatient + carrier claim dates per beneficiary into a single encounter
    list, collapsing any claims within 3 days of each other into one encounter event.
    Returns columns [DESYNPUF_ID, encounter_date].
    """
    import polars as pl

    op = outpatient.select(
        pl.col("DESYNPUF_ID"),
        parse_cms_date("CLM_FROM_DT").alias("clm_date"),
    )
    car = carrier.select(
        pl.col("DESYNPUF_ID"),
        parse_cms_date("CLM_FROM_DT").alias("clm_date"),
    )
    claims = pl.concat([op, car], how="vertical_relaxed").drop_nulls("clm_date")
    claims = claims.unique().sort(["DESYNPUF_ID", "clm_date"])

    # Collapse claims within 3 days of the previous *kept* encounter for that patient.
    # Implemented as a per-group scan since it's an inherently sequential rule.
    ids = claims["DESYNPUF_ID"].to_list()
    dates = claims["clm_date"].to_list()
    out_ids, out_dates = [], []
    prev_id, prev_date = None, None
    for pid, d in zip(ids, dates):
        if pid != prev_id or (d - prev_date).days > 3:
            out_ids.append(pid)
            out_dates.append(d)
        prev_id, prev_date = pid, d
    return pl.DataFrame({"DESYNPUF_ID": out_ids, "encounter_date": out_dates})
