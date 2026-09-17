import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ProvenanceTag } from "../components/Provenance";
import { DoctorEhrView } from "../components/DoctorEhrView";
import { PatientCompanionView } from "../components/PatientCompanionView";

interface ScenarioPreset {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  drug: string;
  missedGapDays: number;
  refilledDaysBeforeVisit: number;
  restingHeartRate: number;
  clinicSystolicBp: number;
  refillHistoryCount: number;
}

const PRESETS: ScenarioPreset[] = [
  {
    id: "white-coat",
    name: "The White-Coat Surge (Showstopper)",
    badge: "High Risk of Dose Escalation",
    badgeColor: "text-rose-400 border-rose-500/30 bg-rose-950/20",
    description: "Patient stopped taking blood pressure pills for 22 days, panicked 3 days before visit, refilled pills, and shows normal blood pressure in clinic.",
    drug: "Propranolol (Beta-Blocker)",
    missedGapDays: 22,
    refilledDaysBeforeVisit: 3,
    restingHeartRate: 86,
    clinicSystolicBp: 126,
    refillHistoryCount: 9,
  },
  {
    id: "true-failure",
    name: "True Medication Failure",
    badge: "Dose Escalation Justified",
    badgeColor: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20",
    description: "Patient took every single pill faithfully without gaps, yet blood pressure stays high at 168 mmHg. Here, increasing the dose is actually necessary.",
    drug: "Lisinopril (ACE Inhibitor)",
    missedGapDays: 0,
    refilledDaysBeforeVisit: 14,
    restingHeartRate: 64,
    clinicSystolicBp: 168,
    refillHistoryCount: 12,
  },
  {
    id: "abstain",
    name: "Sparse Records (AI Abstains)",
    badge: "Safe AI Abstention",
    badgeColor: "text-amber border-amber/30 bg-amber/10",
    description: "Patient only has 2 refills on record. Margin of error is too wide, so the AI safely refuses to guess rather than making an inaccurate claim.",
    drug: "Levothyroxine (Thyroid)",
    missedGapDays: 14,
    refilledDaysBeforeVisit: 3,
    restingHeartRate: 74,
    clinicSystolicBp: 132,
    refillHistoryCount: 2,
  },
  {
    id: "weekend-skipper",
    name: "Weekend & Intermittent Lapses",
    badge: "Habit Friction",
    badgeColor: "text-amber border-amber/30 bg-amber/10",
    description: "Patient regularly forgets doses on weekends. Fasting glucose at clinic is normal, but 3-month HbA1c exposes long-term glycemic escape.",
    drug: "Glipizide (Antidiabetic)",
    missedGapDays: 9,
    refilledDaysBeforeVisit: 2,
    restingHeartRate: 78,
    clinicSystolicBp: 134,
    refillHistoryCount: 8,
  },
  {
    id: "cost-barrier",
    name: "Prescription Abandonment (Cost Barrier)",
    badge: "Pharmacy Friction",
    badgeColor: "text-amber border-amber/30 bg-amber/10",
    description: "Patient ran out of medicine 32 days ago due to out-of-pocket costs and has not refilled. There is no pre-visit surge.",
    drug: "Lovastatin (Cholesterol)",
    missedGapDays: 32,
    refilledDaysBeforeVisit: 0,
    restingHeartRate: 77,
    clinicSystolicBp: 152,
    refillHistoryCount: 6,
  },
];

type ViewMode = "sandbox" | "ehr" | "companion";

export default function SimulatorView() {
  const [viewMode, setViewMode] = useState<ViewMode>("sandbox");
  const [activePresetId, setActivePresetId] = useState<string>("white-coat");
  const [drug, setDrug] = useState<string>("Propranolol (Beta-Blocker)");
  const [missedGapDays, setMissedGapDays] = useState<number>(22);
  const [refilledDaysBeforeVisit, setRefilledDaysBeforeVisit] = useState<number>(3);
  const [restingHeartRate, setRestingHeartRate] = useState<number>(86);
  const [clinicSystolicBp, setClinicSystolicBp] = useState<number>(126);
  const [refillHistoryCount, setRefillHistoryCount] = useState<number>(9);

  // Apply Preset
  const applyPreset = (preset: ScenarioPreset) => {
    setActivePresetId(preset.id);
    setDrug(preset.drug);
    setMissedGapDays(preset.missedGapDays);
    setRefilledDaysBeforeVisit(preset.refilledDaysBeforeVisit);
    setRestingHeartRate(preset.restingHeartRate);
    setClinicSystolicBp(preset.clinicSystolicBp);
    setRefillHistoryCount(preset.refillHistoryCount);
  };

  // Real-Time Diagnostic Engine
  const analysis = useMemo(() => {
    const isAbstaining = refillHistoryCount < 4;
    const hasPreVisitSurge = missedGapDays >= 14 && refilledDaysBeforeVisit >= 1 && refilledDaysBeforeVisit <= 7;
    const isTrueFailure = missedGapDays <= 3 && clinicSystolicBp >= 145;
    const isDropoff = missedGapDays >= 18 && refilledDaysBeforeVisit === 0;

    if (isAbstaining) {
      return {
        status: "abstain",
        badge: "DECISION SAFELY WITHHELD: Insufficient Data (AI Abstains)",
        badgeStyle: "border-amber/40 bg-amber/10 text-amber",
        cardStyle: "border-amber/40 bg-amber/5",
        title: "The AI safely refuses to guess rather than making an inaccurate accusation.",
        explanation: `This patient only has ${refillHistoryCount} refills on record. In clinical medicine, guessing based on sparse data leads to dangerous errors. Because the statistical confidence bounds are too wide, our split-conformal algorithm safely withholds judgment.`,
        action: "Order objective pharmacy fill verification and review baseline medication schedule before altering prescriptions.",
        talkingPoint: `"How has your experience been picking up your refills at the pharmacy? Have you noticed any problems with transportation or co-pays?"`,
        riskLevel: "withheld",
        confidence: "Illustrative rule, not a statistical estimate",
      };
    }

    if (hasPreVisitSurge) {
      return {
        status: "danger",
        badge: "CRITICAL ALERT: White-Coat Adherence Detected (DO NOT ESCALATE DOSE)",
        badgeStyle: "border-rose-500/40 bg-rose-950/30 text-rose-300",
        cardStyle: "border-rose-500/50 bg-rose-950/20",
        title: "DANGER: Increasing the dose will cause severe toxicity when the patient goes home!",
        explanation: `The patient went ${missedGapDays} days without medication, during which their smartwatch recorded an elevated resting heart rate (${restingHeartRate} bpm). They refilled just ${refilledDaysBeforeVisit} days before this visit, producing normal in-clinic blood pressure (${clinicSystolicBp} mmHg). If you double the dose assuming treatment failure, the patient will suffer acute hypotension or bradycardia once regular adherence resumes.`,
        action: "DO NOT ESCALATE DOSE. Maintain current dosage strength and discuss refill consistency.",
        talkingPoint: `"Your clinic numbers look controlled today, but taking this medicine regularly every day is what protects your heart. Was there a period recently where it was hard to take it daily?"`,
        riskLevel: "critical",
        confidence: "Illustrative rule, not a statistical estimate",
      };
    }

    if (isTrueFailure) {
      return {
        status: "escalate",
        badge: "TRUE TREATMENT FAILURE: Dose Escalation Clinically Justified",
        badgeStyle: "border-emerald-500/40 bg-emerald-950/30 text-emerald-300",
        cardStyle: "border-emerald-500/40 bg-emerald-950/20",
        title: "The patient is taking their medication faithfully, but the current dose is inadequate.",
        explanation: `Pharmacy records confirm 100% on-time refill coverage without gaps. Smartwatch telemetry shows a steady, normal resting heart rate (${restingHeartRate} bpm). Despite consistent adherence, clinic blood pressure remains elevated at ${clinicSystolicBp} mmHg. This is genuine pharmacological tolerance, not missed pills.`,
        action: "SAFE TO ESCALATE. Dose increase or adjuvant therapy is clinically indicated.",
        talkingPoint: `"Your refill history and health metrics show that you have been taking your medication faithfully. Since your blood pressure remains high, let us adjust your dose to get you into the healthy range."`,
        riskLevel: "safe-escalate",
        confidence: "Illustrative rule, not a statistical estimate",
      };
    }

    if (isDropoff) {
      return {
        status: "dropoff",
        badge: "REFILL BARRIER ALERT: Patient Has Abandoned Treatment",
        badgeStyle: "border-amber/40 bg-amber/10 text-amber",
        cardStyle: "border-amber/40 bg-amber/5",
        title: "Patient ran out of medicine weeks ago and has not refilled.",
        explanation: `The patient exhausted their supply ${missedGapDays} days ago and did not scramble to refill before this appointment. There is no pre-visit surge. The patient is not trying to deceive the clinic; they likely stopped due to cost, intolerable side effects, or confusion.`,
        action: "Investigate practical barriers. Screen for adverse side effects or pharmacy co-pay obstacles.",
        talkingPoint: `"Many patients stop this medicine because of side effects or pharmacy costs. Have you noticed any uncomfortable symptoms or trouble getting your refills?"`,
        riskLevel: "barrier",
        confidence: "Illustrative rule, not a statistical estimate",
      };
    }

    return {
      status: "stable",
      badge: "STABLE ROUTINE: Consistent Maintenance",
      badgeStyle: "border-emerald-500/40 bg-emerald-950/30 text-emerald-300",
      cardStyle: "border-emerald-500/30 bg-emerald-950/10",
      title: "Patient demonstrates steady, predictable adherence.",
      explanation: `No significant pre-visit surge or prolonged unmedicated gaps detected. Current regimen can be maintained and monitored at regular intervals.`,
      action: "Continue routine monitoring and positive reinforcement.",
      talkingPoint: `"Your refill cadence has been consistent. How are you feeling on this current regimen?"`,
      riskLevel: "low",
      confidence: "Illustrative rule, not a statistical estimate",
    };
  }, [refillHistoryCount, missedGapDays, refilledDaysBeforeVisit, restingHeartRate, clinicSystolicBp]);

  // Generate dynamic 60-day visual timeline
  const timelineDays = useMemo(() => {
    const days: { offset: number; status: "covered" | "gap" | "surge" }[] = [];
    for (let offset = -59; offset <= 0; offset++) {
      const daysBeforeVisit = Math.abs(offset);
      let status: "covered" | "gap" | "surge" = "covered";

      if (daysBeforeVisit <= refilledDaysBeforeVisit) {
        status = "surge";
      } else if (daysBeforeVisit <= missedGapDays) {
        status = "gap";
      } else {
        status = "covered";
      }
      days.push({ offset, status });
    }
    return days;
  }, [missedGapDays, refilledDaysBeforeVisit]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text">Live Clinical Diagnostic Sandbox</h1>
            <span className="rounded-full border border-amber/60 bg-amber/10 px-3 py-0.5 text-xs font-mono font-semibold text-amber">
              Interactive Prototype Demo
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-subtext leading-relaxed">
            An interactive concept mockup: adjust the sliders or load a scenario to see how the product could
            surface pharmacy, wearable, and clinic signals together. This page is illustrative, not connected to
            a real EHR, and its numbers are not statistical output. For the actual analysis on real CMS data, see
            Cohort, Patient, and Instrument.
          </p>
        </div>
      </section>

      {/* View Mode Selector Tabs */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface/80 p-1.5 shadow-sm">
          <button
            onClick={() => setViewMode("sandbox")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer transition-all ${
              viewMode === "sandbox"
                ? "bg-amber text-ground shadow-md"
                : "text-subtext hover:text-text hover:bg-surface"
            }`}
          >
            <span>🔬</span>
            <span>Clinical Diagnostic Sandbox</span>
          </button>

          <button
            onClick={() => setViewMode("ehr")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer transition-all ${
              viewMode === "ehr"
                ? "bg-amber text-ground shadow-md"
                : "text-subtext hover:text-text hover:bg-surface"
            }`}
          >
            <span>🏥</span>
            <span>Doctor Hospital EHR View (Point-of-Care CDS)</span>
            <span
              className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                viewMode === "ehr" ? "bg-ground/40 text-ground" : "bg-hairline text-subtext"
              }`}
            >
              Concept mockup
            </span>
          </button>

          <button
            onClick={() => setViewMode("companion")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer transition-all ${
              viewMode === "companion"
                ? "bg-amber text-ground shadow-md"
                : "text-subtext hover:text-text hover:bg-surface"
            }`}
          >
            <span>📱</span>
            <span>Patient Mobile Companion (Friction Relief)</span>
            <span
              className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                viewMode === "companion" ? "bg-ground/40 text-ground" : "bg-hairline text-subtext"
              }`}
            >
              CarePulse
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-subtext">
          <span className="font-mono text-[11px]">Active Case:</span>
          <span className="rounded bg-surface px-2.5 py-1 font-mono text-amber border border-hairline">
            {PRESETS.find((p) => p.id === activePresetId)?.name || "Custom Telemetry"}
          </span>
        </div>
      </section>

      {/* Tab 1: Clinical Sandbox */}
      {viewMode === "sandbox" && (
        <>
          {/* Quick Scenario Presets */}
          <section className="space-y-3">
            <div className="flex items-center justify-between text-xs text-subtext">
              <span className="font-semibold uppercase tracking-wider text-text">
                Step 1: Choose a Quick Clinical Scenario (Instant Demo)
              </span>
              <span className="font-mono text-[11px]">Click any preset to load its complete health record</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-amber bg-surface shadow-lg ring-2 ring-amber/50"
                        : "border-hairline bg-surface/50 hover:border-hairline/80 hover:bg-surface"
                    }`}
                  >
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-mono font-semibold ${preset.badgeColor}`}>
                      {preset.badge}
                    </span>
                    <span className="text-xs font-bold text-text mt-2 leading-snug">
                      {preset.name}
                    </span>
                    <p className="text-[11px] text-subtext mt-1.5 line-clamp-3 leading-relaxed">
                      {preset.description}
                    </p>
                    <div className="mt-3 pt-2 border-t border-hairline w-full flex justify-between items-center text-[10px] font-mono text-amber">
                      <span>{preset.drug.split(" ")[0]}</span>
                      <span>Select →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Main Interactive Controls & Live Output */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Interactive Sliders (5 cols) */}
            <div className="lg:col-span-5 rounded-xl border border-hairline bg-surface p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-hairline pb-3">
                <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-amber" />
                  Step 2: Adjust Patient Health Signals
                </h3>
                <span className="text-xs font-mono text-subtext">Live Input</span>
              </div>

              {/* Drug Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text uppercase tracking-wider block">
                  Prescribed Chronic Medication
                </label>
                <select
                  value={drug}
                  onChange={(e) => {
                    setDrug(e.target.value);
                    setActivePresetId("custom");
                  }}
                  className="w-full rounded-lg border border-hairline bg-ground px-3 py-2 text-xs font-medium text-text focus:border-amber focus:outline-none"
                >
                  <option value="Propranolol (Beta-Blocker)">Propranolol (Beta-Blocker for High Blood Pressure)</option>
                  <option value="Lisinopril (ACE Inhibitor)">Lisinopril (High Blood Pressure)</option>
                  <option value="Glipizide (Antidiabetic)">Glipizide (Type 2 Diabetes)</option>
                  <option value="Lovastatin (Statin)">Lovastatin (High Cholesterol)</option>
                  <option value="Levothyroxine (Thyroid)">Levothyroxine (Thyroid Replacement)</option>
                </select>
              </div>

              {/* Slider 1: Days of Missed Pills */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-text">Days of Missed Refill Gap:</span>
                  <span className="font-mono font-bold text-amber">{missedGapDays} days without pills</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="45"
                  value={missedGapDays}
                  onChange={(e) => {
                    setMissedGapDays(Number(e.target.value));
                    setActivePresetId("custom");
                  }}
                  className="w-full accent-amber cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-subtext font-mono">
                  <span>0 (Perfect refills)</span>
                  <span>20 days</span>
                  <span>45 days (Severe gap)</span>
                </div>
              </div>

              {/* Slider 2: Pre-Visit Refill Rush */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-text">Pills Refilled Days Before Visit:</span>
                  <span className="font-mono font-bold text-amber">
                    {refilledDaysBeforeVisit === 0 ? "Did not refill (0d)" : `${refilledDaysBeforeVisit} days pre-visit`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="14"
                  value={refilledDaysBeforeVisit}
                  onChange={(e) => {
                    setRefilledDaysBeforeVisit(Number(e.target.value));
                    setActivePresetId("custom");
                  }}
                  className="w-full accent-amber cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-subtext font-mono">
                  <span>0 (No refill)</span>
                  <span>3d (Classic white-coat)</span>
                  <span>14d</span>
                </div>
              </div>

              {/* Slider 3: Smartwatch Resting Heart Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-text">Smartwatch Resting Heart Rate:</span>
                  <span className="font-mono font-bold text-amber">{restingHeartRate} bpm</span>
                </div>
                <input
                  type="range"
                  min="55"
                  max="100"
                  value={restingHeartRate}
                  onChange={(e) => {
                    setRestingHeartRate(Number(e.target.value));
                    setActivePresetId("custom");
                  }}
                  className="w-full accent-amber cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-subtext font-mono">
                  <span>60 bpm (Covered)</span>
                  <span>70 bpm (Normal)</span>
                  <span>90+ bpm (Gap rebound)</span>
                </div>
              </div>

              {/* Slider 4: In-Clinic Blood Pressure */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-text">Today's Clinic Systolic BP:</span>
                  <span className="font-mono font-bold text-amber">{clinicSystolicBp} mmHg</span>
                </div>
                <input
                  type="range"
                  min="110"
                  max="185"
                  value={clinicSystolicBp}
                  onChange={(e) => {
                    setClinicSystolicBp(Number(e.target.value));
                    setActivePresetId("custom");
                  }}
                  className="w-full accent-amber cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-subtext font-mono">
                  <span>120 (Normal)</span>
                  <span>140 (Elevated)</span>
                  <span>180 (Severe)</span>
                </div>
              </div>

              {/* Slider 5: Historical Refill Count (Abstention Trigger) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-text">Patient's Lifetime Refill Records:</span>
                  <span className={`font-mono font-bold ${refillHistoryCount < 4 ? "text-rose-400" : "text-amber"}`}>
                    {refillHistoryCount} fills on file {refillHistoryCount < 4 ? "(Sparse)" : "(Adequate)"}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={refillHistoryCount}
                  onChange={(e) => {
                    setRefillHistoryCount(Number(e.target.value));
                    setActivePresetId("custom");
                  }}
                  className="w-full accent-amber cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-subtext font-mono">
                  <span className="text-rose-400">1 (AI Abstains)</span>
                  <span>4 (Threshold)</span>
                  <span>20 fills</span>
                </div>
              </div>
            </div>

            {/* Right Column: Real-Time Clinical Decision & Live Timeline (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Real-Time AI Alert Card */}
              <div className={`rounded-xl border p-5 shadow-xl transition-all ${analysis.cardStyle}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase ${analysis.badgeStyle}`}>
                    {analysis.badge}
                  </span>
                  <span className="text-xs font-mono text-subtext">
                    Confidence: <strong className="text-text">{analysis.confidence}</strong>
                  </span>
                </div>

                <h3 className="text-base font-bold text-text mt-3 leading-snug">
                  {analysis.title}
                </h3>

                <p className="text-xs text-text/90 mt-2 leading-relaxed">
                  {analysis.explanation}
                </p>

                {/* Doctor Conversation Guidance */}
                <div className="mt-4 rounded-lg border border-hairline/60 bg-ground/85 p-3.5 space-y-1">
                  <span className="text-[11px] font-semibold text-amber uppercase tracking-wider block">
                    Suggested Doctor Conversation Script:
                  </span>
                  <p className="text-xs text-text italic leading-relaxed">
                    {analysis.talkingPoint}
                  </p>
                  <p className="text-[10px] text-subtext pt-0.5">
                    Action: {analysis.action}
                  </p>
                </div>

                {/* Workflow Jump Links */}
                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-hairline/60">
                  <button
                    onClick={() => setViewMode("ehr")}
                    className="rounded-lg border border-amber/50 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber hover:bg-amber/20 cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <span>🏥 Open in Doctor Hospital EHR View →</span>
                  </button>
                  <button
                    onClick={() => setViewMode("companion")}
                    className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-subtext hover:text-text hover:bg-surface/80 cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <span>📱 Preview Patient Mobile Screen →</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Real-Time 60-Day Timeline Visualizer */}
              <div className="rounded-xl border border-hairline bg-surface p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-text">
                      Live 60-Day Medication & Biometric Timeline
                    </h4>
                    <span className="text-[11px] text-subtext">
                      Watch how the timeline updates in real time as you adjust the sliders.
                    </span>
                  </div>
                  <ProvenanceTag kind="simulated" formula="Real-time multi-signal synthesis." />
                </div>

                {/* Dynamic Pill Coverage Strip */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-mono text-subtext">
                    <span>60 Days Ago</span>
                    <span className="text-amber font-semibold">Today (Clinic Appointment)</span>
                  </div>

                  <div className="relative flex h-8 w-full rounded border border-hairline/60 overflow-hidden bg-ground">
                    {timelineDays.map((d, i) => {
                      const fill =
                        d.status === "surge"
                          ? "bg-amber"
                          : d.status === "gap"
                          ? "bg-[#1E2831] border-r border-[#32424E]"
                          : "bg-amber/80 border-r border-amber/40";

                      return (
                        <div
                          key={i}
                          className={`h-full flex-1 ${fill}`}
                          title={`Day ${d.offset}: ${
                            d.status === "surge"
                              ? "Pre-Visit Surge"
                              : d.status === "gap"
                              ? "Unmedicated Gap"
                              : "Pills Covered"
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-[10px] text-subtext pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-3 bg-amber rounded-xs" /> Covered Days
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-3 bg-[#1E2831] border border-hairline rounded-xs" /> Unmedicated Gap ({missedGapDays}d)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-3 bg-amber ring-1 ring-white rounded-xs" /> Pre-Visit Surge ({refilledDaysBeforeVisit}d)
                    </span>
                  </div>
                </div>

                {/* Live Smartwatch Heart Rate Waveform */}
                <div className="rounded-lg border border-hairline bg-ground p-3 pt-4 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-mono text-subtext">
                    <span className="text-amber font-semibold uppercase">Smartwatch Resting Heart Rate Waveform</span>
                    <span>Current Peak: {restingHeartRate} bpm</span>
                  </div>

                  <svg width="100%" height={45} viewBox="0 0 300 40" preserveAspectRatio="none" className="block">
                    <line x1={0} y1={25} x2={300} y2={25} stroke="#32424E" strokeDasharray="3,3" strokeWidth={0.8} />
                    <path
                      d={`M 0,25 Q 75,25 120,${25 - (restingHeartRate - 65) * 0.7} T 240,${25 - (restingHeartRate - 65) * 0.7} Q 280,24 300,25`}
                      fill="none"
                      stroke="#D9A441"
                      strokeWidth={2}
                    />
                  </svg>

                  <div className="flex justify-between text-[9px] font-mono text-subtext">
                    <span>Baseline (~65 bpm)</span>
                    <span className="text-amber">Elevated Gap Rebound ({restingHeartRate} bpm)</span>
                    <span>Visit Normalization</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Tab 2: Doctor Hospital EHR View */}
      {viewMode === "ehr" && (
        <DoctorEhrView
          drug={drug}
          missedGapDays={missedGapDays}
          refilledDaysBeforeVisit={refilledDaysBeforeVisit}
          restingHeartRate={restingHeartRate}
          clinicSystolicBp={clinicSystolicBp}
          refillHistoryCount={refillHistoryCount}
          analysis={analysis}
          onSelectPreset={(presetId) => {
            const preset = PRESETS.find((p) => p.id === presetId);
            if (preset) applyPreset(preset);
          }}
          activePresetId={activePresetId}
        />
      )}

      {/* Tab 3: Patient Mobile Companion */}
      {viewMode === "companion" && (
        <PatientCompanionView
          drug={drug}
          missedGapDays={missedGapDays}
          refilledDaysBeforeVisit={refilledDaysBeforeVisit}
          clinicSystolicBp={clinicSystolicBp}
        />
      )}

      {/* Footer Navigation */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-4 text-xs text-subtext">
        <span>Vanishing Dose Interactive Engine · Manipal Hackathon 2026</span>
        <div className="flex gap-3">
          <Link to="/patient" className="text-text hover:text-amber transition-colors">
            View Real CMS Patient Dossiers →
          </Link>
          <Link to="/cohort" className="text-text hover:text-amber transition-colors">
            View 6,286 Patient Population Study →
          </Link>
        </div>
      </section>
    </div>
  );
}
