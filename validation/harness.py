"""
Validation harness: statistical power of the detector, on synthetic injected-effect
data only.

This file is deliberately self-contained and does NOT import anything from pipeline/ --
the detector that runs on real data and the harness that validates it are separate code
paths, per the project's core integrity rule. Every number this script produces is
tagged "simulated" downstream and rendered on its own Instrument-screen panel, never
mixed with the real cohort's result.

What it answers: at what true pre-appointment lift does the alignment-and-permutation
detector (same statistic as pipeline/04_align.py: mean coverage in [-14,-1] minus mean
coverage in [-60,-31], tested against a within-patient encounter-shuffle null) reach 80%
power, for a cohort this size, at a given level of patient-to-patient noise?

The injected effect sizes are anchored to a real physiological adherence-validation
study rather than picked arbitrarily: in resistant hypertension with serum drug levels
as ground truth, non-adherent patients averaged 80.9 bpm heart rate versus 66.6 bpm for
adherent ones, and a 75.5 bpm threshold gave AUC 0.802 (sensitivity 62.5%, specificity
86.8%). That is a real-world signal roughly this size or smaller being detectable by a
much cruder single-visit heart-rate check; this harness asks whether the phase-alignment
statistic can detect comparably-sized or smaller *coverage* effects with repeated
observation.
"""
from pathlib import Path

import numpy as np
import polars as pl

# No import from pipeline/ -- this harness is a fully independent code path from the
# real-data detector, by design. Its own seed, distinct from the real pipeline's.
HARNESS_SEED = 20260913
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "processed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

N_DAYS = 1096  # matches the real pipeline's 2008-01-01..2010-12-31 window
OFFSETS = np.arange(-60, 31)
N_OFF = len(OFFSETS)
NEAR_MASK = (OFFSETS >= -14) & (OFFSETS <= -1)
FAR_MASK = (OFFSETS >= -60) & (OFFSETS <= -31)

EFFECT_SIZES = np.round(np.linspace(0.0, 0.05, 9), 4)   # sweep: injected true lift
NOISE_LEVELS = [0.10, 0.25]                              # patient-to-patient baseline heterogeneity (sd)
N_REPLICATES = 40
N_PATIENTS = 200          # cohort size for this sweep -- smaller than the real cohort's
                          # 6,286 pairs on purpose, so the power curve has a visible rise
                          # instead of saturating at the first nonzero effect size
N_ENCOUNTERS_RANGE = (4, 10)
N_PERMUTATIONS = 150
ALPHA = 0.05
TARGET_POWER = 0.80

# Anchoring reference, cited in the README:
PHYS_REF = {
    "non_adherent_hr_bpm": 80.9, "adherent_hr_bpm": 66.6,
    "threshold_bpm": 75.5, "auc": 0.802, "sensitivity": 0.625, "specificity": 0.868,
    "source": "resistant hypertension, serum drug levels as adherence ground truth "
              "(cited in README.md)",
}


def simulate_replicate(rng: np.random.Generator, effect_size: float, noise_sd: float,
                        n_patients: int = N_PATIENTS) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Build one synthetic cohort: n_patients daily coverage arrays with heterogeneous
    baseline adherence plus a known injected pre-appointment lift, and a random
    encounter calendar per patient. Returns (status_matrix, enc_days, enc_mask)."""
    baseline = np.clip(rng.normal(0.55, noise_sd, size=n_patients), 0.05, 0.95)
    n_enc = rng.integers(N_ENCOUNTERS_RANGE[0], N_ENCOUNTERS_RANGE[1] + 1, size=n_patients)
    max_enc = int(n_enc.max())

    enc_days = np.zeros((n_patients, max_enc), dtype=np.int32)
    enc_mask = np.zeros((n_patients, max_enc), dtype=bool)
    for i in range(n_patients):
        days = np.sort(rng.integers(70, N_DAYS - 40, size=n_enc[i]))  # keep clear of window edges
        enc_days[i, :n_enc[i]] = days
        enc_mask[i, :n_enc[i]] = True

    # Per-day covered probability starts at each patient's baseline, then gets lifted
    # for days that fall in [-14,-1] relative to ANY of that patient's encounters.
    prob = np.tile(baseline[:, None], (1, N_DAYS))
    day_grid = np.arange(N_DAYS)
    for i in range(n_patients):
        for e in enc_days[i, :n_enc[i]]:
            in_pre_band = (day_grid >= e - 14) & (day_grid <= e - 1)
            prob[i, in_pre_band] = np.clip(prob[i, in_pre_band] + effect_size, 0, 1)

    status = (rng.random((n_patients, N_DAYS)) < prob).astype(np.int8)  # 1=covered, 0=uncovered
    return status, enc_days, enc_mask


def lift_and_p(status: np.ndarray, enc_days: np.ndarray, enc_mask: np.ndarray,
               rng: np.random.Generator) -> tuple[float, float]:
    n_patients = status.shape[0]
    status_flat = status.reshape(-1)
    identity_rows = np.arange(n_patients)

    def gather(pair_row, days):
        day_idx = days[:, :, None] + OFFSETS[None, None, :]
        in_range = (day_idx >= 0) & (day_idx < N_DAYS)
        valid = enc_mask[:, :, None] & in_range
        day_idx_c = np.clip(day_idx, 0, N_DAYS - 1)
        flat_idx = pair_row[:, None, None] * N_DAYS + day_idx_c
        vals = status_flat[flat_idx]
        covered_sum = (valid & (vals == 1)).sum(axis=(0, 1)).astype(np.float64)
        n_sum = valid.sum(axis=(0, 1)).astype(np.float64)  # no censoring in simulated data
        return covered_sum, n_sum

    def lift(covered_sum, n_sum):
        with np.errstate(invalid="ignore", divide="ignore"):
            mean_cov = np.where(n_sum > 0, covered_sum / n_sum, np.nan)
        near = np.average(mean_cov[NEAR_MASK], weights=n_sum[NEAR_MASK])
        far = np.average(mean_cov[FAR_MASK], weights=n_sum[FAR_MASK])
        return float(near - far)

    c_sum, n_sum = gather(identity_rows, enc_days)
    observed = lift(c_sum, n_sum)

    null_lifts = np.empty(N_PERMUTATIONS)
    for i in range(N_PERMUTATIONS):
        perm_days = rng.integers(0, N_DAYS, size=enc_days.shape, dtype=np.int32)
        c_sum_p, n_sum_p = gather(identity_rows, perm_days)
        null_lifts[i] = lift(c_sum_p, n_sum_p)

    if observed >= 0:
        p = float((np.sum(null_lifts >= observed) + 1) / (N_PERMUTATIONS + 1))
    else:
        p = float((np.sum(null_lifts <= observed) + 1) / (N_PERMUTATIONS + 1))
    return observed, p


def main():
    print("Validation harness: power sweep (simulated data only)")
    rng = np.random.default_rng(HARNESS_SEED)

    rows = []
    for noise_sd in NOISE_LEVELS:
        for effect_size in EFFECT_SIZES:
            n_significant = 0
            observed_lifts = []
            for r in range(N_REPLICATES):
                status, enc_days, enc_mask = simulate_replicate(rng, effect_size, noise_sd)
                observed, p = lift_and_p(status, enc_days, enc_mask, rng)
                observed_lifts.append(observed)
                if p < ALPHA:
                    n_significant += 1
            power = n_significant / N_REPLICATES
            rows.append({
                "noise_sd": noise_sd, "true_effect_size": float(effect_size),
                "power": power, "n_replicates": N_REPLICATES,
                "mean_observed_lift": float(np.mean(observed_lifts)),
            })
            print(f"  noise_sd={noise_sd:.2f}  effect={effect_size:.3f}  power={power:.2f}")

    power_df = pl.DataFrame(rows)
    power_df.write_parquet(OUT_DIR / "power_curve.parquet")

    # Report, per noise level, the smallest swept effect size reaching 80% power
    # (interpolated), for the README / Instrument-screen headline number.
    print("\n  === effect size at 80% power, by noise level ===")
    for noise_sd in NOISE_LEVELS:
        sub = power_df.filter(pl.col("noise_sd") == noise_sd).sort("true_effect_size")
        effects = sub["true_effect_size"].to_numpy()
        powers = sub["power"].to_numpy()
        above = np.where(powers >= TARGET_POWER)[0]
        if len(above) == 0:
            print(f"    noise_sd={noise_sd:.2f}: 80% power not reached within swept range (max {effects.max():.2f})")
        else:
            print(f"    noise_sd={noise_sd:.2f}: reached at true effect size ~{effects[above[0]]:.3f}")

    print(f"\n  physiological anchor (cited in README): {PHYS_REF}")
    print("  wrote data/processed/power_curve.parquet")


if __name__ == "__main__":
    main()
