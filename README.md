# RxPulse: Multi-Signal Clinical Evidence Instrument

> Built for **Manipal Hackathon 2026 (M# 2026)**
> **Track:** Healthcare (Good Health and Well-being)
> **Problem Statement ID:** P01: The Vanishing Dose: Detecting Medication Non-Adherence Without Asking

---

## 1. The Clinical Problem

When a patient with high blood pressure or diabetes visits the clinic and their readings remain high, the standard medical reflex is to **escalate the dose**.

**The Danger:** If the true cause of poor control is intermittent dose skipping, doubling the prescription becomes hazardous the moment the patient starts taking it regularly. When they go home and resume the stronger medication, they risk acute hypotension, bradycardia, dizziness, or emergency room visits.

Clinicians currently lack visibility into what happens between quarterly clinic visits. A patient may skip pills for weeks and then take them faithfully for 3 to 4 days right before their scheduled appointment (a pattern known as **White-Coat Adherence**). In the clinic, short-term vitals look temporarily improved or standard metrics average the gaps away. 

**Vanishing Dose** exists to separate:
> **"The drug isn't working"** from **"The drug isn't being taken."**

---

## 2. Multi-Signal Architecture

Rather than asking patients to manually log missed doses or assuming they are non-compliant, Vanishing Dose brings together three independent healthcare signals:

```
[ Pharmacy Refills (CMS Claims) ] ──┐
[ Wearable Smartwatch Telemetry  ] ──┼─▶ [ Inconsistency Reasoner ] ──▶ [ Clinical Action Alert ]
[ Clinic Encounter Biomarkers   ] ──┘
```

1. **Pharmacy Prescription Events (CMS Claims):** Tracks 3-year fill histories, days-supply exhausted, refill gaps, and hospital stay censoring.
2. **Wearable Physiological Telemetry (Smartwatch Sensors):** Tracks daily continuous Resting Heart Rate (bpm), activity step count, and sleep. When patients discontinue medications like beta-blockers or antihypertensives during refill gaps, resting heart rate rebounds upward (+14 to +18 bpm) and normalizes acutely 72 hours before clinic visits.
3. **In-Clinic Biomarkers & EHR Progress Notes:** Connects clinic blood pressure (systolic/diastolic) and laboratory biomarkers:
   - Fasting Glucose vs 3-month HbA1c (Diabetes)
   - Serum TSH (Thyroid replacement)
   - LDL-C (Statins)
   - Weight & fluid retention (Diuretics)
4. **Cross-Signal Inconsistency Reasoner:** Cross-correlates disparate signals (for example, normal in-clinic blood pressure masking an unmedicated 21-day gap with elevated heart rate).

---

## 3. Data Honesty & Provenance

Every data point in the application carries an explicit provenance tag (`measured`, `derived`, or `simulated`):

* **Measured Data:** Real government claims from the [CMS 2008-2010 Data Entrepreneurs' Synthetic Public Use File (DE-SynPUF), Sample 1](https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-claims-synthetic-public-use-files/cms-2008-2010-data-entrepreneurs-synthetic-public-use-file-de-synpuf). Contains 116,352 beneficiaries across 8 official Medicare files (Prescription Drug Events, Outpatient, Carrier, Inpatient, and Enrollment files).
* **Physiological Wearables & Vitals:** Because public Medicare claims do not include proprietary Apple Watch/Fitbit sensor logs, daily resting heart rate telemetry and clinic encounter vitals are physiologically modeled and anchored to published medical literature (e.g., autonomic heart-rate rebound in resistant hypertension).
* **Why the Cohort Average is +0.0 pp:** The CMS DE-SynPUF dataset is an anonymized synthetic file where CMS smoothed refill timestamps for patient privacy. Rather than doctoring public government data to fake an effect, our system honestly reports the measured baseline (+0.0 pp) and provides a simulated benchmark toggle to demonstrate detector sensitivity on real-world surges.

---

## 4. Key Features & Innovations

### A. Non-Judgmental Clinical Decision Support
The system avoids punitive diagnostic labels. Instead of declaring a patient "non-compliant", it alerts the physician:
* **"DO NOT ESCALATE DOSE: Pre-Visit Surge Detected"**
* Provides **Doctor Conversation Tips** that encourage exploring practical obstacles (e.g. co-pay costs, pharmacy transport, or side effects) in a supportive manner.

### B. Doctor Hospital EHR View (Point-of-Care Screen)
Simulates an Epic/Cerner hospital EHR consultation interface:
* Patient demographic banner (Robert Miller, 68M, resistant hypertension).
* Live vitals comparison (in-clinic blood pressure vs 30-day smartwatch resting pulse).
* Prominent Vanishing Dose CDS alert.
* **One-Click Clinical Order Center**:
  1. *Maintain Dose (Decline Escalation):* Defers dosage increase, preventing outpatient toxicity.
  2. *Send Co-Pay Assistance Referral:* Auto-enrolls patient into manufacturer $0 co-pay card.
  3. *Order Smart Pill Dispenser:* Ships Bluetooth-enabled cap to eliminate future unmonitored lapses.
  4. *Auto-Generate Clinical Chart Note:* Inserts complete non-accusatory progress note into hospital record with one-click copy.

### C. Patient Mobile Companion (CarePulse App)
A smartphone preview demonstrating how Vanishing Dose replaces patient blame with supportive friction relief:
* Gentle, non-stigmatizing check-in notification.
* One-click $15 co-pay reduction voucher claim.
* Free 2-day doorstep pharmacy delivery request.
* Interactive confidential pharmacist chat with instant responses for common side effects (dizziness, cost, travel).

### D. Safe AI Abstention (Split-Conformal Prediction)
When a patient has sparse refill history (only 2 to 3 fills), the margin of error is too wide to make a safe determination. Rather than hallucinating an inaccurate guess, the system safely **withholds the prediction** and flags the need for more baseline records.

### E. Adherence Archetypes (GMM Clustering)
Unsupervised Gaussian Mixture Models classify refill behaviors into 6 clinical profiles:
1. High overall coverage
2. Frequent week-plus gaps (weekend skippers)
3. One long gap, declining over time (cost or side-effect drop-off)
4. Irregular refill timing
5. Low overall coverage (pill rationing)
6. Evenly spaced gaps

---

## 5. Quickstart Guide

### Prerequisites
* Node.js v18+ and npm
* Python 3.10+

### Option A: Launch the Frontend Directly (Pre-Generated Data Included)

```bash
# Clone repository
git clone https://github.com/tanishkuvar11/RxPulse.git
cd RxPulse/app

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

### Option B: Run the Full Python Processing Pipeline

```bash
# Set up Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run pipeline stages
python pipeline/_ndc_targets.py   # RxNorm ingredient lookup
python pipeline/01_ingest.py      # Ingest CMS DE-SynPUF Sample 1
python pipeline/02_normalize.py   # Cohort selection funnel
python pipeline/03_coverage.py    # Daily PDC calculation & hospital censoring
python pipeline/04_align.py       # Phase alignment & permutation testing
python pipeline/05_archetypes.py  # GMM adherence clustering
python pipeline/06_hypotheses.py  # Competing explanation checks
python pipeline/07_conformal.py   # Split-conformal calibration & abstention
python validation/harness.py      # Independent power validation sweep
python pipeline/08_export.py      # Export static JSON artifacts to app/public/data/
python pipeline/enrich_signals.py # Multi-signal wearable & vitals enrichment

# Launch app
cd app
npm install
npm run dev
```

---

## 6. Repository Layout

```
Vanishing-Dose/
  pipeline/
    01_ingest.py          Download and parse CMS claims files
    02_normalize.py       Map NDCs to target ingredients
    03_coverage.py        Daily coverage series per patient
    04_align.py           Phase alignment & permutation testing
    05_archetypes.py      GMM clustering into 6 habit groups
    06_hypotheses.py      Competing explanation checks
    07_conformal.py       Conformal prediction intervals & abstention
    08_export.py          Write static JSON artifacts for app
    enrich_signals.py     Generate multi-signal wearables & vitals
  validation/
    harness.py            Statistical power validation on simulated cohorts
  app/
    public/data/          Exported JSON data files
    src/
      components/
        DoctorEhrView.tsx           Simulated Epic/Cerner EHR Point-of-Care view
        PatientCompanionView.tsx    CarePulse patient mobile companion screen
        ClinicalActionBanner.tsx    Clinician guidance & conversation tips
        MultiSignalTimeline.tsx     Synchronized 3-layer timeline visualizer
        InconsistencyReasoner.tsx   Cross-signal analysis cards
        AxisTransition.tsx          Phase alignment transition visualizer
        PhaseCurveChart.tsx         Visx population coverage curve
        ConformalCard.tsx           Calibrated uncertainty & abstention
        HypothesisPanel.tsx         Alternative explanation verification
        ArchetypeCards.tsx          GMM behavioral archetype profiles
      views/
        Hero.tsx                    Interactive introduction & 30-second dilemma
        SimulatorView.tsx           Live Interactive Diagnostic Sandbox & Demo
        CohortView.tsx              6,286 patient Medicare analysis & benchmark
        PatientView.tsx             Individual patient dossiers & telemetry
        InstrumentView.tsx          Statistical accuracy & calibration testing
  README.md
  requirements.txt
```

---

## 7. License

MIT License. Designed for clinical decision support and educational research.
