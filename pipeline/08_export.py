"""
Stage 8: write every JSON artifact the app reads from app/public/data/.

This is the one place the pipeline and the frontend touch. The app never talks to a
database or an API; it fetches these static files. Every numeric value that ends up on
screen carries a `provenance` tag here already -- "measured" (untouched from a
downloaded public file), "derived" (computed by this pipeline from measured data), or
"simulated" (validation-harness output only) -- so the frontend never has to guess.

Running this script twice against the same processed/ directory produces byte-identical
JSON: every source of randomness upstream is seeded (see common.SEED), and this script
itself introduces none.
"""
import json
import sys
from pathlib import Path

import numpy as np
import polars as pl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import PROCESSED, APP_DATA, SEED, MIN_FILLS, MIN_ENCOUNTERS


def j(obj):
    """Round-trip through JSON with sorted keys and fixed float formatting so re-runs
    are byte-identical."""
    return json.dumps(obj, indent=2, sort_keys=True, default=_default)


def _default(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return None if np.isnan(o) else round(float(o), 6)
    if hasattr(o, "isoformat"):
        return o.isoformat()
    raise TypeError(f"not JSON serializable: {type(o)}")


def write(name, obj):
    path = APP_DATA / name
    path.write_text(j(obj))
    print(f"  wrote {path} ({path.stat().st_size:,} bytes)")


def export_provenance():
    write("provenance.json", {
        "measured": "Value comes from a CMS DE-SynPUF file, downloaded once and read "
                    "without modification.",
        "derived": "Value is computed by this pipeline from measured data. Hover for "
                   "the formula.",
        "simulated": "Value comes from the validation harness (synthetic, injected-effect "
                     "data), never from the real cohort. Shown only on the Instrument screen.",
    })


def export_funnel():
    funnel = pl.read_parquet(PROCESSED / "funnel.parquet")
    write("funnel.json", {
        "provenance": "derived",
        "steps": [{"label": r["step"], "n": r["n_beneficiaries"]} for r in funnel.iter_rows(named=True)],
        "min_fills": MIN_FILLS,
        "min_encounters": MIN_ENCOUNTERS,
    })


def export_cohort_curve():
    curve = pl.read_parquet(PROCESSED / "phase_curve.parquet").sort("offset_days")
    null_dist = pl.read_parquet(PROCESSED / "permutation_null.parquet")
    summary = pl.read_parquet(PROCESSED / "alignment_summary.parquet").row(0, named=True)

    null_lo, null_hi = np.nanpercentile(null_dist["null_lift"].to_numpy(), [2.5, 97.5])

    write("cohort_curve.json", {
        "provenance": "derived",
        "offsets": curve["offset_days"].to_list(),
        "mean_coverage": curve["mean_coverage"].to_list(),
        "n_observations": curve["n_observations"].to_list(),
        "near_band": [-14, -1],
        "far_band": [-60, -31],
        "result": {
            "observed_lift": summary["observed_lift"],
            "p_value": summary["p_value"],
            "ci_lo": summary["ci_lo"],
            "ci_hi": summary["ci_hi"],
            "n_permutations": summary["n_permutations"],
            "n_bootstrap": summary["n_bootstrap"],
            "n_pairs": summary["n_pairs"],
            "null_band_95": [float(null_lo), float(null_hi)],
        },
    })


def export_archetypes():
    centroids = pl.read_parquet(PROCESSED / "archetype_centroids.parquet")
    archetypes = pl.read_parquet(PROCESSED / "archetypes.parquet")
    counts = archetypes.group_by("cluster").agg(pl.len().alias("n"))
    counts_by_cluster = {r["cluster"]: r["n"] for r in counts.iter_rows(named=True)}

    write("archetypes.json", {
        "provenance": "derived",
        "clusters": [
            {
                "cluster": r["cluster"],
                "label": r["label"],
                "n": counts_by_cluster.get(r["cluster"], 0),
                "centroid": {k[5:]: v for k, v in r.items() if k.startswith("feat_")},
            }
            for r in centroids.iter_rows(named=True)
        ],
    })


def export_instrument():
    """Power curves + calibration curve: validation-harness output (simulated) plus
    the real conformal calibration check (derived, run on the real cohort's held-out
    split)."""
    power = pl.read_parquet(PROCESSED / "power_curve.parquet") if (PROCESSED / "power_curve.parquet").exists() else None
    calib = pl.read_parquet(PROCESSED / "conformal_calibration_curve.parquet")

    obj = {
        "provenance_note": "Power curve is simulated (validation harness, injected effect). "
                            "Calibration curve is derived from the real cohort's held-out split.",
        "calibration_curve": {
            "provenance": "derived",
            "nominal_coverage": calib["nominal_coverage"].to_list(),
            "realized_coverage": calib["realized_coverage"].to_list(),
            "n_val": calib["n_val"].to_list(),
        },
    }
    if power is not None:
        obj["power_curve"] = {
            "provenance": "simulated",
            "rows": power.to_dicts(),
        }
    write("instrument.json", obj)


def export_patients():
    """A curated set of patient-ingredient rows for the Patient view: hypotheses,
    conformal interval, archetype, next-observation ranking, and enough of the raw
    coverage strip + encounter list to draw the dosing calendar."""
    cohort = pl.read_parquet(PROCESSED / "cohort.parquet")
    per_patient = pl.read_parquet(PROCESSED / "per_patient_lift.parquet")
    conformal = pl.read_parquet(PROCESSED / "conformal_intervals.parquet")
    hyps = pl.read_parquet(PROCESSED / "hypotheses.parquet")
    archetypes = pl.read_parquet(PROCESSED / "archetypes.parquet")
    next_obs = pl.read_parquet(PROCESSED / "next_observations.parquet")
    coverage = pl.read_parquet(PROCESSED / "coverage.parquet")
    encounters = pl.read_parquet(PROCESSED / "encounters.parquet")

    # Rank candidates for the demo: widest-interval (abstained) pair, largest positive
    # lift, largest negative lift, and a few more at random (seeded) for variety.
    if conformal.height == 0:
        write("patients.json", {"provenance": "derived", "patients": []})
        return

    conf_sorted = conformal.sort("half_width", descending=True)
    abstain_pid = conf_sorted.row(0, named=True)
    lift_sorted = per_patient.sort("pre_appointment_lift", descending=True)
    top_lift_pid = lift_sorted.row(0, named=True) if lift_sorted.height else None
    bottom_lift_pid = lift_sorted.row(-1, named=True) if lift_sorted.height else None

    rng = np.random.default_rng(SEED)
    all_ids = per_patient.select(["DESYNPUF_ID", "ingredient"]).unique()
    n_extra = min(7, all_ids.height)
    extra_idx = rng.choice(all_ids.height, size=n_extra, replace=False)
    extra_rows = [all_ids.row(int(i), named=True) for i in extra_idx]

    candidates = {(abstain_pid["DESYNPUF_ID"], abstain_pid["ingredient"])}
    if top_lift_pid:
        candidates.add((top_lift_pid["DESYNPUF_ID"], top_lift_pid["ingredient"]))
    if bottom_lift_pid:
        candidates.add((bottom_lift_pid["DESYNPUF_ID"], bottom_lift_pid["ingredient"]))
    for r in extra_rows:
        candidates.add((r["DESYNPUF_ID"], r["ingredient"]))

    patients_out = []
    for pid, ing in candidates:
        cohort_row = cohort.filter((pl.col("DESYNPUF_ID") == pid) & (pl.col("ingredient") == ing))
        if cohort_row.height == 0:
            continue
        drug_class = cohort_row["drug_class"][0]
        n_fills = int(cohort_row["n_fills"][0])

        conf_row = conformal.filter((pl.col("DESYNPUF_ID") == pid) & (pl.col("ingredient") == ing))
        conf = conf_row.row(0, named=True) if conf_row.height else None

        arch_row = archetypes.filter((pl.col("DESYNPUF_ID") == pid) & (pl.col("ingredient") == ing))
        archetype = arch_row.row(0, named=True) if arch_row.height else None

        hyp_rows = hyps.filter((pl.col("DESYNPUF_ID") == pid) & (pl.col("ingredient") == ing))
        hypotheses = [{"hypothesis": r["hypothesis"], "verdict": r["verdict"], "evidence": r["evidence"]}
                      for r in hyp_rows.iter_rows(named=True)]

        obs_rows = next_obs.filter((pl.col("DESYNPUF_ID") == pid) & (pl.col("ingredient") == ing)).sort(
            "expected_bits_reduced", descending=True)
        next_observations = [{"observation": r["observation"], "expected_bits_reduced": r["expected_bits_reduced"]}
                              for r in obs_rows.iter_rows(named=True)]

        cov_rows = coverage.filter((pl.col("DESYNPUF_ID") == pid) & (pl.col("ingredient") == ing)).sort("date")
        enc_rows = encounters.filter(pl.col("DESYNPUF_ID") == pid).sort("encounter_date")

        patients_out.append({
            "id": f"{pid}__{ing}",
            "desynpuf_id": pid,
            "ingredient": ing,
            "drug_class": drug_class,
            "n_fills": n_fills,
            "archetype": {"cluster": archetype["cluster"], "label": archetype["cluster_label"]} if archetype else None,
            "pre_appointment_lift": conf["pre_appointment_lift"] if conf else None,
            "conformal": ({
                "predicted_lift": conf["predicted_lift"],
                "interval_lo": conf["interval_lo"],
                "interval_hi": conf["interval_hi"],
                "abstain": bool(conf["abstain"]),
            } if conf else None),
            "hypotheses": hypotheses,
            "next_observations": next_observations,
            "coverage_dates": cov_rows["date"].to_list(),
            "coverage_status": cov_rows["status"].to_list(),
            "encounter_dates": enc_rows["encounter_date"].to_list(),
        })

    write("patients.json", {"provenance": "derived", "patients": patients_out})


def export_about_data():
    write("about_data.json", {
        "source": "CMS 2008-2010 Data Entrepreneurs' Synthetic Public Use File (DE-SynPUF), Sample 1.",
        "what_it_is": "Fully synthetic data generated by CMS from a 5% sample of real Medicare "
                      "beneficiaries and their claims. No beneficiary in this file is an actual "
                      "person. CMS's own codebook states the synthesis process 'significantly "
                      "diminishes the analytic utility of the file' and that 'analytic inferences "
                      "to the Medicare population should not be made' from it.",
        "why_used": "No public dataset carries ground-truth medication adherence, because the gold "
                    "standard is electronic pill-bottle monitoring, and that data stays inside "
                    "individual clinical trials. DE-SynPUF is the only public, claims-shaped, "
                    "multi-year dataset that lets this tool be built and tested end-to-end.",
        "known_limitations": [
            "The NDC field (PROD_SRVC_ID) is disclosure-perturbed per CMS's own codebook (PDE-4: "
            "'imputed/suppressed/coarsened as part of disclosure treatment'), and its record-level "
            "frequency distribution is far flatter than real-world drug dispensing. This project maps "
            "NDCs to ingredient by building a target NDC set from ~25 known chronic-maintenance "
            "ingredients via RxNorm, rather than trying to classify all 268,563 unique codes in the "
            "file.",
            "Three target ingredients (amlodipine, pioglitazone, sitagliptin) returned zero RxNorm "
            "drug concepts under this project's lookup and are absent from the NDC target set; the "
            "antihypertensive and oral-antidiabetic classes are under-represented as a result.",
            "There is no explicit hypertension chronic-condition flag in the DE-SynPUF beneficiary "
            "summary file (CMS's chronic-condition list omits it), so cohort selection here is by "
            "drug fill, not by diagnosis.",
            "Because this is synthetic data, any real effect (or absence of one) found in the cohort "
            "screen reflects CMS's synthesis process, not necessarily real-world Medicare patients.",
        ],
        "provenance": "measured",
    })


def main():
    print("Stage 8: export")
    export_provenance()
    export_funnel()
    export_cohort_curve()
    export_archetypes()
    export_instrument()
    export_patients()
    export_about_data()
    print("\n  done.")


if __name__ == "__main__":
    main()
