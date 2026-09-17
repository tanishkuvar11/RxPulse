"""
Stage 7: calibrated uncertainty on the per-patient lift estimate.

Split-conformal prediction: half the cohort calibrates a nonconformity score, the other
half (plus the calibration half itself, for the final published intervals) gets an
interval built from that score. The score is normalized by each patient's own number of
encounters (a locally-weighted conformal trick): patients with few encounters get a
wider interval, which is exactly the abstention behavior the project wants -- a patient
we can't say much about should get an interval that says so, not a falsely confident one.

Then abstain: if a patient's interval is wider than a fixed threshold, the tool refuses
to make a claim about them and says why. The empirical coverage plot (predicted vs
realized coverage at a grid of nominal levels, checked on the held-out half) is the
credibility check for the whole interval-construction procedure.
"""
import sys
from pathlib import Path

import numpy as np
import polars as pl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import PROCESSED, SEED

TARGET_COVERAGE = 0.90
ABSTAIN_HALF_WIDTH = 0.20  # coverage-fraction units; wider than this and we decline to claim
COVERAGE_GRID = np.round(np.arange(0.50, 0.991, 0.05), 3)


def conformal_quantile(scores: np.ndarray, coverage: float) -> float:
    n = len(scores)
    rank = int(np.ceil((n + 1) * coverage))
    rank = min(rank, n)
    return float(np.sort(scores)[rank - 1])


def main():
    print("Stage 7: conformal calibration")
    per_patient = pl.read_parquet(PROCESSED / "per_patient_lift.parquet").drop_nulls("pre_appointment_lift")
    n = per_patient.height
    if n < 10:
        print(f"  cohort too small ({n} pairs) for a meaningful split-conformal calibration; "
              "writing an empty result and flagging this in the export.")
        pl.DataFrame({"DESYNPUF_ID": [], "ingredient": [], "lift": [], "interval_lo": [],
                      "interval_hi": [], "abstain": []}).write_parquet(PROCESSED / "conformal_intervals.parquet")
        pl.DataFrame({"nominal_coverage": [], "realized_coverage": [], "n_val": []}).write_parquet(
            PROCESSED / "conformal_calibration_curve.parquet")
        return

    rng = np.random.default_rng(SEED)
    idx = rng.permutation(n)
    cal_idx, val_idx = idx[: n // 2], idx[n // 2:]

    lift = per_patient["pre_appointment_lift"].to_numpy()
    eff_n = np.maximum(per_patient["n_encounters"].to_numpy(), 1)
    baseline = float(np.mean(lift[cal_idx]))  # predicted lift for everyone: the calibration-set mean

    def scores(indices):
        return np.abs(lift[indices] - baseline) * np.sqrt(eff_n[indices])

    cal_scores = scores(cal_idx)
    q = conformal_quantile(cal_scores, TARGET_COVERAGE)
    half_width = q / np.sqrt(eff_n)

    interval_lo = baseline - half_width
    interval_hi = baseline + half_width
    abstain = half_width > ABSTAIN_HALF_WIDTH

    out = per_patient.with_columns([
        pl.Series("predicted_lift", np.full(n, baseline)),
        pl.Series("interval_lo", interval_lo),
        pl.Series("interval_hi", interval_hi),
        pl.Series("half_width", half_width),
        pl.Series("abstain", abstain),
    ])
    out.write_parquet(PROCESSED / "conformal_intervals.parquet")

    n_abstain = int(abstain.sum())
    print(f"  target coverage {TARGET_COVERAGE:.0%}, baseline predicted lift {baseline:+.4f}")
    print(f"  {n_abstain}/{n} patient-ingredient pairs abstained (interval half-width > {ABSTAIN_HALF_WIDTH})")

    # Empirical coverage curve: at each nominal level, recompute q from calibration
    # scores, apply to the held-out validation set, and measure realized coverage.
    curve_rows = []
    for nominal in COVERAGE_GRID:
        q_nom = conformal_quantile(cal_scores, float(nominal))
        hw_val = q_nom / np.sqrt(eff_n[val_idx])
        lo = baseline - hw_val
        hi = baseline + hw_val
        covered = (lift[val_idx] >= lo) & (lift[val_idx] <= hi)
        curve_rows.append({
            "nominal_coverage": float(nominal),
            "realized_coverage": float(covered.mean()),
            "n_val": len(val_idx),
        })
    pl.DataFrame(curve_rows).write_parquet(PROCESSED / "conformal_calibration_curve.parquet")
    print("  wrote empirical coverage calibration curve "
          f"({len(curve_rows)} nominal levels, validated on {len(val_idx)} held-out pairs)")


if __name__ == "__main__":
    main()
