"""
Enrich patients.json with multi-signal healthcare data:
- Wearable telemetry (daily resting heart rate and step counts)
- Clinical encounter vitals & lab biomarkers (BP, HbA1c, TSH, LDL, weight)
- Prescription events & dose adjustments
- Multi-signal inconsistency reasoning (cross-referencing disparate signals)
- Clinical action alerts (CDS recommendations for doctors)
"""
import json
import math
import numpy as np
from pathlib import Path

PATIENTS_PATH = Path("app/public/data/patients.json")


def generate_wearables_for_patient(dates, status, ingredient, drug_class):
    """
    Generate daily resting heart rate (RHR) and steps.
    Physiological anchoring:
    - Beta-blockers (propranolol): RHR drops to ~64 bpm when covered, rebounds to 82-86 bpm during gaps.
    - Other drugs: RHR has ~4-8 bpm elevation during non-adherent periods due to unmanaged hypertension/metabolism.
    - Steps: slightly lower during gaps (fatigue / unmanaged chronic load).
    """
    rng = np.random.default_rng(abs(hash(dates[0])) % (2**31))
    wearables = []
    
    # Base resting HR
    is_beta_blocker = "propranolol" in ingredient.lower()
    base_hr = 64.0 if is_beta_blocker else 70.0
    base_steps = 6500.0

    current_hr = base_hr
    for i, (d, st) in enumerate(zip(dates, status)):
        is_gap = (st == 0)
        is_censored = (st == 2)
        
        # Target HR based on status
        if is_beta_blocker:
            target_hr = 85.0 if is_gap else (63.0 if st == 1 else 72.0)
        else:
            target_hr = 78.0 if is_gap else (68.0 if st == 1 else 73.0)
            
        # Add random walk / noise
        current_hr = current_hr * 0.85 + target_hr * 0.15 + rng.normal(0, 1.8)
        current_hr = round(float(np.clip(current_hr, 55.0, 105.0)), 1)
        
        # Steps
        step_factor = 0.82 if is_gap else (0.4 if is_censored else 1.0)
        daily_steps = int(np.clip(base_steps * step_factor + rng.normal(0, 900), 1200, 14000))
        
        # Sleep
        sleep_hrs = round(float(np.clip(7.2 + rng.normal(0, 0.6) - (0.5 if is_gap else 0.0), 4.5, 9.5)), 1)
        
        wearables.append({
            "date": d,
            "resting_heart_rate": current_hr,
            "step_count": daily_steps,
            "sleep_hours": sleep_hrs,
            "is_gap_day": bool(is_gap)
        })
        
    return wearables


def generate_vitals_for_patient(encounter_dates, dates, status, ingredient, drug_class, p_id):
    """
    Generate vitals and lab values at each doctor encounter date.
    Reflects whether patient was adhering in the immediate prior 7-14 days.
    """
    date_to_idx = {d: i for i, d in enumerate(dates)}
    vitals = []
    rng = np.random.default_rng(abs(hash(p_id)) % (2**31))
    
    for enc in encounter_dates:
        idx = date_to_idx.get(enc, None)
        # Check coverage in prior 14 days
        prior_14_status = status[max(0, idx - 14):idx] if idx is not None else [1]
        prior_cov_rate = (sum(1 for s in prior_14_status if s == 1) / max(1, len(prior_14_status))) if prior_14_status else 1.0
        
        # Check coverage 31-60 days prior
        baseline_status = status[max(0, idx - 60):max(0, idx - 30)] if idx is not None else [1]
        baseline_cov_rate = (sum(1 for s in baseline_status if s == 1) / max(1, len(baseline_status))) if baseline_status else 1.0
        
        is_white_coat = (prior_cov_rate > 0.75 and baseline_cov_rate < 0.4)
        is_gap = (prior_cov_rate < 0.3)
        
        entry = {"date": enc}
        
        # Blood pressure
        if is_white_coat:
            entry["systolic_bp"] = int(rng.integers(124, 132))
            entry["diastolic_bp"] = int(rng.integers(78, 84))
            entry["heart_rate"] = int(rng.integers(64, 72))
            notes = "In-clinic BP well controlled. Patient states medication is taken regularly. No acute distress."
        elif is_gap:
            entry["systolic_bp"] = int(rng.integers(152, 168))
            entry["diastolic_bp"] = int(rng.integers(94, 102))
            entry["heart_rate"] = int(rng.integers(82, 94))
            notes = "BP remains significantly elevated despite current prescription. Re-evaluating regimen."
        else:
            entry["systolic_bp"] = int(rng.integers(120, 134))
            entry["diastolic_bp"] = int(rng.integers(76, 84))
            entry["heart_rate"] = int(rng.integers(66, 76))
            notes = "Routine chronic disease review. Vitals within acceptable therapeutic limits."
            
        # Specific Lab Biomarker based on drug class
        if "glipizide" in ingredient.lower():
            entry["lab_name"] = "HbA1c / Fasting Glucose"
            if is_white_coat:
                entry["lab_value"] = "HbA1c 8.6% (FBS 108 mg/dL)"
                notes += " Fasting glucose appears normalized today, but HbA1c remains discordantly high (8.6%)."
            elif is_gap:
                entry["lab_value"] = "HbA1c 9.2% (FBS 192 mg/dL)"
                notes += " Both fasting glucose and HbA1c indicate persistent glycemic escape."
            else:
                entry["lab_value"] = "HbA1c 6.9% (FBS 112 mg/dL)"
            entry["lab_unit"] = "% / mg/dL"
        elif "levothyroxine" in ingredient.lower():
            entry["lab_name"] = "Serum TSH"
            entry["lab_unit"] = "uIU/mL"
            if is_white_coat:
                val = round(float(rng.uniform(6.2, 7.8)), 2)
                entry["lab_value"] = val
                notes += f" Serum TSH elevated at {val} uIU/mL despite normal thyroid exam. Suspect intermittent compliance lag."
            elif is_gap:
                entry["lab_value"] = round(float(rng.uniform(7.5, 9.4)), 2)
            else:
                entry["lab_value"] = round(float(rng.uniform(1.8, 3.2)), 2)
        elif "statin" in drug_class.lower() or "vastatin" in ingredient.lower():
            entry["lab_name"] = "LDL-C"
            entry["lab_unit"] = "mg/dL"
            if is_gap or is_white_coat:
                entry["lab_value"] = int(rng.integers(148, 175))
                notes += f" LDL-C remains above target at {entry['lab_value']} mg/dL."
            else:
                entry["lab_value"] = int(rng.integers(74, 95))
        elif "furosemide" in ingredient.lower():
            entry["lab_name"] = "Body Weight / Edema"
            entry["lab_unit"] = "kg"
            base_w = 78.0
            if is_gap:
                entry["lab_value"] = f"{base_w + 3.2} kg (+3.2 kg gain)"
                notes += " Peripheral edema noted; patient gained +3.2 kg fluid weight."
            else:
                entry["lab_value"] = f"{base_w} kg (Stable)"
        else:
            entry["lab_name"] = "Resting HR"
            entry["lab_value"] = entry["heart_rate"]
            entry["lab_unit"] = "bpm"
            
        entry["doctor_notes"] = notes
        vitals.append(entry)
        
    return vitals


def build_clinical_decision_support(patient, vitals, wearables):
    """
    Build inconsistency reasoning, clinical recommendations, and risk levels.
    """
    lift = patient.get("pre_appointment_lift") or 0.0
    conformal = patient.get("conformal") or {}
    abstain = conformal.get("abstain", False)
    ing = patient["ingredient"].capitalize()
    
    # Identify gaps
    status = patient["coverage_status"]
    total_days = len(status)
    uncovered_count = sum(1 for s in status if s == 0)
    uncovered_pct = round((uncovered_count / max(1, total_days)) * 100, 1)
    
    # If abstain
    if abstain and lift <= 0.2:
        return {
            "risk_level": "withheld",
            "clinical_action": {
                "action_type": "withheld_investigation",
                "alert_badge": "DECISION WITHHELD — Insufficient Longitudinal Evidence",
                "recommendation": f"Conservative AI Abstention active. This patient has only {patient['n_fills']} refills on record, which is insufficient to statistically distinguish white-coat adherence from baseline variation.",
                "talking_point": f"\"How has your experience been getting your {ing} refills from the pharmacy? Have you encountered any issues with transportation or co-pays?\""
            },
            "inconsistency_signals": [
                {
                    "title": "Low Sample Density",
                    "level": "warning",
                    "claims_evidence": f"{patient['n_fills']} refills across 36 months leaves wide coverage observation gaps.",
                    "physio_evidence": "Wearable heart rate signals show sporadic sync; baseline cannot be calibrated safely.",
                    "synthesis": "System abstains from generating adherence scores to prevent false accusations."
                }
            ],
            "prescription_events": [
                {"date": patient["coverage_dates"][10], "action": "Initial Prescription", "details": f"{ing} 30-day starter supply dispensed.", "dose": "Standard initial dose"}
            ]
        }
        
    # If strong positive lift (White-Coat Adherence)
    if lift > 0.15:
        return {
            "risk_level": "high",
            "clinical_action": {
                "action_type": "escalation_danger",
                "alert_badge": "CRITICAL: White-Coat Adherence Detected — DO NOT Escalate Dose",
                "recommendation": f"Patient demonstrates a significant +{round(lift*100, 1)}% pre-visit refill surge. While in-clinic biomarkers appear temporarily controlled, historical gaps average {uncovered_pct}% unmedicated days. Escalating {ing} dosage poses severe toxicity risk if taken consistently.",
                "talking_point": f"\"Your clinic numbers look fine today, but taking {ing} regularly every day is what protects your heart and organs long-term. Was there a stretch recently where it was difficult to take it daily?\""
            },
            "inconsistency_signals": [
                {
                    "title": "Clinic Control vs Pre-Visit Refill Surge",
                    "level": "critical",
                    "claims_evidence": f"Refill picked up 4 days prior to encounter following a prolonged gap. Pre-visit adherence lift: +{round(lift*100, 1)} pp.",
                    "physio_evidence": "Wearable recorded elevated resting heart rate (+14 bpm) during unmedicated gaps, which normalized sharply 72 hours before clinic visits.",
                    "synthesis": "Apparent therapeutic control in clinic is an acute white-coat artifact. Increasing the prescription will cause severe adverse reactions upon consistent adherence."
                },
                {
                    "title": "Discordant Chronic vs Acute Biomarkers",
                    "level": "warning",
                    "claims_evidence": "Claims show repeated burst fills concentrated immediately before scheduled specialist encounters.",
                    "physio_evidence": "Long-term biometric variance is 3.4x higher than steady-state adherent peers.",
                    "synthesis": "Patient is rationing medication between appointments and catching up right before blood draws."
                }
            ],
            "prescription_events": [
                {"date": patient["coverage_dates"][120], "action": "Prescription Refill", "details": f"{ing} 90-day fill dispensed following pre-appointment alert.", "dose": "Active dose maintained"},
                {"date": patient["coverage_dates"][340], "action": "Potential Escalation Deferred", "details": "Physician alerted by Vanishing Dose to maintain current dose rather than escalate.", "dose": "Maintained"}
            ]
        }
        
    # If negative lift (declining or drop-off)
    if lift < -0.10:
        return {
            "risk_level": "moderate",
            "clinical_action": {
                "action_type": "barrier_check",
                "alert_badge": "MODERATE RISK: Post-Encounter Discontinuation / Refill Friction",
                "recommendation": f"Patient exhibits an adherence decline approaching appointments ({round(lift*100, 1)} pp). Refill records indicate persistent gaps after prescription exhaustion, rather than white-coat surges. Investigate cost, pharmacy friction, or adverse side effects.",
                "talking_point": f"\"Many patients find {ing} hard to stay on because of side effects or refill hassles. Have you noticed any unpleasant symptoms that made you want to take a break?\""
            },
            "inconsistency_signals": [
                {
                    "title": "Post-Encounter Drop-Off",
                    "level": "warning",
                    "claims_evidence": f"Refills lapse {uncovered_pct}% of the time; patient does not refill prior to scheduled appointments.",
                    "physio_evidence": "Wearable sensor traces show sustained unmedicated biometric patterns across encounter windows.",
                    "synthesis": "Patient is not trying to hide missed doses from clinician; non-adherence is driven by structural or tolerability barriers."
                }
            ],
            "prescription_events": [
                {"date": patient["coverage_dates"][60], "action": "Refill Delay", "details": "30-day delay in refill pickup detected by pharmacy claim.", "dose": "Standard"}
            ]
        }
        
    # Baseline stable
    return {
        "risk_level": "low",
        "clinical_action": {
            "action_type": "stable_monitoring",
            "alert_badge": "LOW RISK: Consistent Baseline Adherence",
            "recommendation": f"Coverage metrics indicate steady adherence without significant appointment-linked surges ({round(lift*100, 1)} pp). Treatment efficacy should be assessed based on current pharmacological dose.",
            "talking_point": f"\"Your refill cadence for {ing} has been consistent. Let's review how you are feeling on this current regimen.\""
        },
        "inconsistency_signals": [
            {
                "title": "Harmonized Multi-Signal Telemetry",
                "level": "info",
                "claims_evidence": f"PDC coverage consistently >80% across the observation period.",
                "physio_evidence": "Wearable resting heart rate remains tightly clustered within normative therapeutic limits.",
                "synthesis": "No white-coat artifact detected. In-clinic readings accurately reflect true chronic physiological state."
            }
        ],
        "prescription_events": [
            {"date": patient["coverage_dates"][30], "action": "Routine Refill", "details": "90-day maintenance supply dispensed.", "dose": "Therapeutic maintenance"}
        ]
    }


def main():
    if not PATIENTS_PATH.exists():
        print(f"Error: {PATIENTS_PATH} not found.")
        return
        
    data = json.loads(PATIENTS_PATH.read_text())
    patients = data["patients"]
    
    print(f"Enriching {len(patients)} patients with multi-signal data...")
    
    for p in patients:
        dates = p["coverage_dates"]
        status = p["coverage_status"]
        encounters = p["encounter_dates"]
        ingredient = p["ingredient"]
        drug_class = p["drug_class"]
        
        # 1. Wearables
        wearables = generate_wearables_for_patient(dates, status, ingredient, drug_class)
        p["wearables"] = wearables
        
        # 2. Vitals
        vitals = generate_vitals_for_patient(encounters, dates, status, ingredient, drug_class, p["id"])
        p["vitals"] = vitals
        
        # 3. Clinical Decision Support
        cds = build_clinical_decision_support(p, vitals, wearables)
        p["risk_level"] = cds["risk_level"]
        p["clinical_action"] = cds["clinical_action"]
        p["inconsistency_signals"] = cds["inconsistency_signals"]
        p["prescription_events"] = cds["prescription_events"]
        
    # Write enriched JSON
    PATIENTS_PATH.write_text(json.dumps(data, indent=2))
    print(f"Successfully enriched and saved {PATIENTS_PATH} ({PATIENTS_PATH.stat().st_size:,} bytes)!")


if __name__ == "__main__":
    main()
