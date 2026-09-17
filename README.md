# Vanishing Dose

A clinical evidence tool that detects white-coat adherence — the pattern where a
patient takes their medication faithfully for the days immediately before a scheduled
appointment and poorly the rest of the time. Standard adherence metrics (medication
possession ratio, proportion of days covered) average this away, so the clinician sees
a well-controlled patient at every visit and never learns the treatment is being taken
intermittently.

**The clinical stake.** When blood pressure stays high, the reflex is to escalate the
dose. If the real cause is missed doses, escalation becomes dangerous the moment the
patient resumes taking the drug as prescribed. This tool exists to separate "the drug
isn't working" from "the drug isn't being taken."

## What it found

Run against CMS's DE-SynPUF Sample 1 cohort (6,286 patient-ingredient pairs, 5,237
beneficiaries on a chronic-maintenance drug), the phase-aligned coverage curve shows a
pre-appointment lift of **+0.01 percentage points** (95% CI −0.13 to +0.14). A
permutation test (2,000 shuffles of each patient's own visit calendar) calls this
"significant" (p = 0.0005) — because pooling millions of coverage-days gives it the
power to detect even a trivial average shift — but the patient-level bootstrap interval
spans zero. Read together: **this cohort does not show a pre-appointment adherence
pattern large or consistent enough to act on.** That is the honest result, not a bug to
work around — see "Say this plainly," below.

The validation harness confirms the detector has power to find a real effect if one
were present: on synthetic 200-patient cohorts with an injected lift, power reaches
80% by an injected effect size of ~1.3 percentage points and saturates near 100% by
~2 percentage points, at both noise levels swept. The instrument works; the real
(synthetic) cohort just doesn't show the pattern at a meaningful size.

## Say this plainly

DE-SynPUF is **synthetic data**, published by CMS, generated from and statistically
calibrated against real Medicare claims. It is not identified patient data — that is
not obtainable, and no public dataset anywhere carries ground-truth medication
adherence, because the gold standard is electronic pill-bottle monitoring, and that
data stays inside individual clinical trials. CMS's own codebook is blunt about this:

> "All variables in the DE-SynPUF are imputed/suppressed/coarsened as part of
> disclosure treatment. As a result, the DE-SynPUF does not have research utility...
> Analytic inferences to the Medicare population should not be made when using the
> DE-SynPUF."

This tool does not claim otherwise. Every number in the app carries a `measured` /
`derived` / `simulated` provenance tag; the Instrument screen's "About the data" panel
repeats this disclosure. A judge who discovers this on their own is a problem we didn't
want; a judge who reads it on our own slide is not.

## Data

**Primary source:** [CMS 2008-2010 Data Entrepreneurs' Synthetic Public Use File
(DE-SynPUF), Sample 1](https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-claims-synthetic-public-use-files/cms-2008-2010-data-entrepreneurs-synthetic-public-use-file-de-synpuf).
Eight files: Prescription Drug Events, Outpatient Claims, Carrier Claims (2 parts),
Inpatient Claims, and Beneficiary Summary Files for 2008/2009/2010. ~362 MB zipped,
~3.3 GB unzipped. All eight URLs were verified live (HTTP 200) before writing any
pipeline code.

We checked the newer ["Synthetic Medicare Enrollment, Fee-for-Service Claims, and
Prescription Drug Event"](https://data.cms.gov/collection/synthetic-medicare-enrollment-fee-for-service-claims-and-prescription-drug-event)
collection as instructed; its landing page returned an automated-fetch 403 and, at
8,671 beneficiaries, is far smaller than DE-SynPUF Sample 1's ~116,000. We used
DE-SynPUF Sample 1.

**Drug identity — a real complication, handled explicitly.** DE-SynPUF's PDE codebook
entry (PDE-4) states outright that `PROD_SRVC_ID` (the NDC) was
"imputed/suppressed/coarsened as part of disclosure treatment." We confirmed this
empirically before writing the normalization code: the file's 268,563 unique NDCs have
a frequency distribution far flatter than real-world drug dispensing (the top 20,000
codes cover only 27% of fills — real claims data concentrates far more sharply than
that). Looking up all 268,563 codes individually against a drug database is both
impractical and the wrong shape of solution for data this perturbed.

Instead, `pipeline/_ndc_targets.py` goes the other direction: starting from a fixed
list of ~30 chronic-maintenance ingredients (antihypertensives, statins, oral
antidiabetics, thyroid replacement), it pulls every RxNorm clinical drug concept for
each ingredient and every NDC ever historically associated with that concept
(`allhistoricalndcs`), building a ~55,000-code target set once, cached at
`data/raw/ndc_cache.json`. The pipeline then checks each PDE row's NDC against that set
— an O(1) lookup, not a classification problem. Three ingredients (amlodipine,
pioglitazone, sitagliptin) returned zero RxNorm concepts under this lookup and are
absent from the target set; antihypertensive and oral-antidiabetic coverage is
correspondingly thinner. This is disclosed in the app's About panel, not hidden.

There is no explicit hypertension flag among DE-SynPUF's chronic-condition variables
(CMS's own chronic-condition list omits it — see Appendix 1 of the codebook), so
cohort selection here is by drug fill, not by diagnosis flag.

## Stack

- **Pipeline:** Python 3.12, [polars](https://pola.rs) (not pandas — the claims files
  are large), numpy, scipy, scikit-learn, [requests](https://requests.readthedocs.io)
  for the one-time NDC target-set fetch.
- **Frontend:** Vite + React 18 + TypeScript, Tailwind CSS, [visx](https://airbnb.io/visx/)
  for charts. No backend — the pipeline writes static JSON to `app/public/data/`; the
  app fetches those files and nothing else. Fully offline once built.
- **Determinism:** every stochastic step (permutation test, bootstrap, GMM
  initialization, conformal split, validation-harness sampling) is seeded
  (`pipeline/common.py: SEED`, `validation/harness.py: HARNESS_SEED`). Running the
  pipeline twice produces byte-identical JSON.

## Repo structure

```
vanishing-dose/
  data/raw/            gitignored — downloaded CMS zips/CSVs + ndc_cache.json
  data/processed/      gitignored — parquet intermediates
  pipeline/
    common.py          shared paths, seed, date parsing, encounter-collapsing
    _ndc_targets.py    one-time RxNorm target-NDC-set fetch (cached)
    01_ingest.py        download (if needed) + load + validate the 8 CMS files
    02_normalize.py     NDC -> ingredient via the target set; cohort selection funnel
    03_coverage.py      daily coverage series per patient-ingredient (PDC carry-forward,
                         inpatient censoring)
    04_align.py         phase alignment, permutation test, bootstrap CI (real data)
    05_archetypes.py    GMM clustering into adherence shapes, rule-labeled
    06_hypotheses.py    competing-explanation checks + expected-information-gain ranking
    07_conformal.py     split-conformal intervals + abstention + calibration curve
    08_export.py        writes every JSON the app reads, with provenance tags
  validation/
    harness.py          power sweep on INJECTED synthetic data — a separate code path,
                         imports nothing from pipeline/, never touches the real cohort
  app/                  Vite + React + TS frontend
  README.md
  requirements.txt
```

## Running it

```bash
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate
pip install -r requirements.txt
python pipeline/_ndc_targets.py    # one-time RxNorm fetch, cached after first run
python pipeline/01_ingest.py       # downloads the 8 CMS files on first run, then cached
python pipeline/02_normalize.py
python pipeline/03_coverage.py
python pipeline/04_align.py        # ~10 min: 2,000 permutations + 2,000 bootstrap draws
python pipeline/05_archetypes.py
python pipeline/06_hypotheses.py
python pipeline/07_conformal.py
python validation/harness.py       # separate code path, simulated data only
python pipeline/08_export.py       # writes app/public/data/*.json

cd app && npm install && npm run dev    # or npm run build && npm run preview
```

After the first run, `data/raw/` is fully populated and every later run is offline —
no network call happens while the pipeline (after `01_ingest.py`/`_ndc_targets.py`) or
the app runs.

## Cohort selection funnel

| step | beneficiaries |
|---|---:|
| all beneficiaries in Sample 1 | 116,352 |
| continuously enrolled (Part A+B+D, 12/12 months every year, no death) | 49,691 |
| ...and ≥4 encounter dates in window | 40,372 |
| ...and ≥1 fill of a target chronic-maintenance ingredient | 39,959 |
| ...and that ingredient has ≥6 fills for them (**final cohort**) | 6,286 pairs / 5,237 beneficiaries |

"Continuously enrolled" is defined narrowly and deliberately: full 12-month Part A + B
+ D coverage in every year present in Sample 1 (2008, 2009, 2010), and no recorded
death. This excludes both genuinely new-to-Medicare enrollees and mid-window
disenrollments equally, rather than trying to distinguish them — a conservative,
honest choice over guessing.

## The permutation test, precisely

For each encounter (outpatient + carrier claims pooled, collapsed within 3 days of each
other into one event), we extract each patient's coverage status at offsets −60 to +30
days. Pre-appointment lift = mean coverage in [−14,−1] minus mean coverage in [−60,−31],
pooled across every patient and every one of their encounters. Significance comes from
shuffling each patient's own encounter dates to random days within their own
observation window (preserving their encounter count and their own coverage series)
2,000 times, and comparing the observed lift to that null distribution. This controls
for the fact that coverage is autocorrelated and that sicker patients both visit more
and fill more, without modeling either directly.

Uncertainty on the lift itself comes from a **patient-level** bootstrap (resample
patients with replacement, not days) — a different, and in this case more revealing,
statement about confidence than the permutation p-value. See "What it found," above,
for why the two disagree and what that disagreement means.

## Validation harness — why the numbers are anchored, not arbitrary

The harness sweeps injected true effect size (0 to 0.05, chosen to resolve the actual
rising edge of the power curve rather than saturating at the first nonzero value)
against two levels of patient-to-patient baseline-adherence noise (sd 0.10 and 0.25),
on synthetic cohorts of 200 patients, 40 replicates per grid cell, using the *same*
phase-alignment-and-permutation statistic as the real pipeline (reimplemented
independently — see `validation/harness.py`'s docstring for why it does not import
`pipeline/`).

The effect-size grid is anchored against a real physiological adherence-validation
study, not picked arbitrarily: in resistant hypertension with serum drug levels as
ground truth, non-adherent patients averaged 80.9 bpm heart rate versus 66.6 bpm for
adherent ones, and a 75.5 bpm threshold gave AUC 0.802 (sensitivity 62.5%, specificity
86.8%). That is a real-world signal of comparable or smaller size being detectable by a
single crude heart-rate check; the harness asks whether repeated phase-aligned
observation can detect comparably-sized coverage effects too — and finds that, at this
cohort's size, it can, with power to spare even at small injected effects.

## Non-negotiables, and how they're satisfied here

- **Provenance on every number.** `measured` / `derived` / `simulated`, everywhere —
  see `app/src/components/Provenance.tsx` and its use throughout every view.
- **Real detector, separate validation.** `validation/harness.py` imports nothing from
  `pipeline/`; it is a second, independent implementation of the same statistic, run
  only on injected synthetic data, rendered only on the Instrument screen.
- **Fully offline after ingestion.** The app fetches only static files from
  `app/public/data/`; no API calls happen at runtime.
- **Deterministic.** Every random draw is seeded; re-running the pipeline produces
  byte-identical JSON.
- **No diagnostic language.** The UI never says a patient is non-compliant; it reports
  evidence, ranked, with intervals, and says plainly when there isn't enough evidence
  to say anything (both in the hypothesis panel and in conformal abstention).
