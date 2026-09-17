import { useState } from "react";

interface DoctorEhrViewProps {
  drug: string;
  missedGapDays: number;
  refilledDaysBeforeVisit: number;
  restingHeartRate: number;
  clinicSystolicBp: number;
  refillHistoryCount: number;
  analysis: {
    status: string;
    badge: string;
    badgeStyle?: string;
    cardStyle?: string;
    title: string;
    explanation: string;
    action: string;
    talkingPoint: string;
    riskLevel: string;
    confidence: string;
  };
  onSelectPreset?: (presetId: string) => void;
  activePresetId?: string;
}

export function DoctorEhrView({
  drug,
  missedGapDays,
  refilledDaysBeforeVisit,
  restingHeartRate,
  clinicSystolicBp,
  refillHistoryCount,
  analysis,
  onSelectPreset,
  activePresetId,
}: DoctorEhrViewProps) {
  // Interactive action states
  const [doseOrderState, setDoseOrderState] = useState<"none" | "maintained" | "escalated">("none");
  const [copayDispatched, setCopayDispatched] = useState<boolean>(false);
  const [smartCapOrdered, setSmartCapOrdered] = useState<boolean>(false);
  const [noteInserted, setNoteInserted] = useState<boolean>(false);
  const [copiedNote, setCopiedNote] = useState<boolean>(false);

  // Generate simulated progress note
  const progressNoteText = `CLINICAL PROGRESS NOTE: Outpatient Cardiology Follow-Up
PATIENT: Miller, Robert (68M) | MRN: #4829104
DATE: Today | PROVIDER: Sarah Jenkins, MD

SUBJECTIVE:
Patient presents for 6-month routine follow-up regarding chronic hypertension management. Reports taking ${drug} daily as prescribed.

OBJECTIVE:
- In-Clinic Blood Pressure: ${clinicSystolicBp}/82 mmHg
- In-Clinic Pulse: ${Math.max(58, restingHeartRate - 10)} bpm
- Smartwatch 30-Day Mean Resting Heart Rate: ${restingHeartRate} bpm
- Pharmacy Claims Analysis (Vanishing Dose CDS):
  * Documented unmedicated refill gap: ${missedGapDays} days
  * Pre-appointment refill timing: ${refilledDaysBeforeVisit} days prior to encounter
  * Lifetime prescription fill count: ${refillHistoryCount} fills

CLINICAL DECISION SUPPORT ASSESSMENT:
${analysis.title}
${analysis.explanation}

PLAN:
${
  analysis.status === "danger"
    ? `1. DOSAGE ESCALATION DEFERRED: Propranolol dose retained at current strength. Increasing dosage would create a high risk of severe outpatient hypotension or bradycardia once baseline medication adherence resumes.
2. ADHERENCE SUPPORT: Enrolled patient in pharmacy co-pay assistance and home delivery program.
3. MONITORING: Scheduled 60-day remote telemetry review.`
    : analysis.status === "escalate"
    ? `1. DOSAGE ESCALATION APPROVED: True pharmacological treatment resistance confirmed via uninterrupted 100% adherence and steady resting heart rate. Dose titrated to target blood pressure under 130/80 mmHg.
2. MONITORING: Follow-up lab panel scheduled in 4 weeks.`
    : `1. TREATMENT PLAN: Regimen maintained. Continue active monitoring and routine follow-up.`
}`;

  const handleCopyNote = () => {
    navigator.clipboard.writeText(progressNoteText);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* EHR Screen Container */}
      <div className="rounded-xl border border-hairline bg-[#111921] shadow-2xl overflow-hidden font-sans">
        {/* Top EHR Application Bar (Epic / Cerner style) */}
        <div className="flex flex-wrap items-center justify-between border-b border-hairline bg-[#16212B] px-4 py-2.5 text-xs text-subtext">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 rounded-full bg-emerald-400" title="EHR Server Online" />
            <span className="font-semibold text-text tracking-wide">
              St. Jude Regional Hospital EHR (Epic Hyperspace CDS)
            </span>
            <span className="hidden sm:inline text-hairline">|</span>
            <span className="hidden sm:inline text-[11px] text-subtext">Department: Outpatient Cardiology</span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-subtext">Provider: Dr. Sarah Jenkins, MD</span>
            <span className="rounded bg-ground px-2 py-0.5 font-mono text-amber border border-amber/30">
              CDS Active
            </span>
          </div>
        </div>

        {/* Quick EHR Scenario Switcher (Helpful for Hackathon Video Demos) */}
        {onSelectPreset && (
          <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-ground/80 px-4 py-2 text-xs">
            <span className="font-semibold text-text text-[11px] uppercase tracking-wider">
              Quick Test Patient Cases:
            </span>
            <button
              onClick={() => onSelectPreset("white-coat")}
              className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer transition-all ${
                activePresetId === "white-coat"
                  ? "bg-rose-950/60 text-rose-300 border border-rose-500/50"
                  : "bg-surface text-subtext border border-hairline hover:text-text"
              }`}
            >
              1. White-Coat Surge (Dose Danger)
            </button>
            <button
              onClick={() => onSelectPreset("true-failure")}
              className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer transition-all ${
                activePresetId === "true-failure"
                  ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/50"
                  : "bg-surface text-subtext border border-hairline hover:text-text"
              }`}
            >
              2. True Drug Failure (Safe Escalate)
            </button>
            <button
              onClick={() => onSelectPreset("abstain")}
              className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer transition-all ${
                activePresetId === "abstain"
                  ? "bg-amber/20 text-amber border border-amber/50"
                  : "bg-surface text-subtext border border-hairline hover:text-text"
              }`}
            >
              3. Sparse Data (AI Abstains)
            </button>
            <button
              onClick={() => onSelectPreset("cost-barrier")}
              className={`rounded px-2.5 py-1 text-xs font-medium cursor-pointer transition-all ${
                activePresetId === "cost-barrier"
                  ? "bg-amber/20 text-amber border border-amber/50"
                  : "bg-surface text-subtext border border-hairline hover:text-text"
              }`}
            >
              4. Cost Dropoff
            </button>
          </div>
        )}

        {/* Patient Demographic Banner */}
        <div className="border-b border-hairline bg-surface/70 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber/15 border border-amber/40 text-base font-bold text-amber">
                RM
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-text">Miller, Robert</h2>
                  <span className="text-xs text-subtext font-mono">68 yrs · Male</span>
                  <span className="rounded bg-hairline/60 px-1.5 py-0.5 text-[10px] font-mono text-subtext">
                    MRN: #4829104
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-subtext mt-0.5">
                  <span>DOB: 1958-04-12</span>
                  <span>Phone: (555) 234-8901</span>
                  <span>Coverage: Medicare Part D</span>
                  <span className="text-emerald-400">Allergies: NKDA (No Known Drug Allergies)</span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="font-semibold text-text block">Encounter: Routine 6-Month Cardiology</span>
              <span className="text-subtext block">Today at 10:30 AM · Exam Room 4B</span>
              <span className="text-[11px] text-amber font-mono">Chief Complaint: Resistant Hypertension</span>
            </div>
          </div>
        </div>

        {/* Clinical Vitals & Current Orders Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-hairline/40 border-b border-hairline text-xs">
          <div className="bg-[#111921] p-3 space-y-0.5">
            <span className="text-[10px] uppercase text-subtext font-semibold tracking-wider block">
              Today In-Clinic BP
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold font-mono text-text">{clinicSystolicBp}/82</span>
              <span className="text-[10px] text-subtext">mmHg</span>
            </div>
            <span className="text-[10px] text-subtext">Previous: 162/94 mmHg</span>
          </div>

          <div className="bg-[#111921] p-3 space-y-0.5">
            <span className="text-[10px] uppercase text-subtext font-semibold tracking-wider block">
              Smartwatch Resting HR
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-bold font-mono ${restingHeartRate > 80 ? "text-rose-400" : "text-text"}`}>
                {restingHeartRate}
              </span>
              <span className="text-[10px] text-subtext">bpm</span>
            </div>
            <span className="text-[10px] text-subtext">
              {restingHeartRate > 80 ? "Elevated during gap" : "Steady baseline"}
            </span>
          </div>

          <div className="bg-[#111921] p-3 space-y-0.5">
            <span className="text-[10px] uppercase text-subtext font-semibold tracking-wider block">
              Current Active Regimen
            </span>
            <div className="font-semibold text-text truncate">{drug.split(" ")[0]} 40mg</div>
            <span className="text-[10px] text-subtext">
              Refilled {refilledDaysBeforeVisit === 0 ? "Not refilled" : `${refilledDaysBeforeVisit} days ago`}
            </span>
          </div>

          <div className="bg-[#111921] p-3 space-y-0.5">
            <span className="text-[10px] uppercase text-subtext font-semibold tracking-wider block">
              Pharmacy Fill History
            </span>
            <div className="font-semibold font-mono text-text">
              {refillHistoryCount} fills on file
            </div>
            <span className="text-[10px] text-subtext">
              {refillHistoryCount < 4 ? "Sparse longitudinal data" : "Adequate records (>4)"}
            </span>
          </div>
        </div>

        {/* Main EHR Body: Vanishing Dose CDS Alert & Decision Space */}
        <div className="p-5 space-y-5">
          {/* CDS Alert Banner */}
          <div className={`rounded-xl border p-4.5 space-y-3 transition-all ${analysis.cardStyle}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-text">
                  EHR Clinical Decision Support (CDS) Early Warning
                </span>
              </div>
              <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${analysis.badgeStyle}`}>
                {analysis.badge}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-text leading-snug">
                {analysis.title}
              </h3>
              <p className="text-xs text-text/90 mt-1.5 leading-relaxed">
                {analysis.explanation}
              </p>
            </div>

            {/* Provider Talking Guidance */}
            <div className="rounded-lg border border-hairline bg-ground/90 p-3 text-xs space-y-1">
              <span className="font-semibold text-amber uppercase text-[10px] tracking-wider block">
                Evidence-Based Provider Conversation Script:
              </span>
              <p className="text-text italic leading-relaxed">
                {analysis.talkingPoint}
              </p>
              <span className="text-[10px] text-subtext block pt-0.5">
                Recommended Direction: {analysis.action}
              </span>
            </div>
          </div>

          {/* Interactive Point-of-Care Doctor Actions */}
          <div className="rounded-xl border border-hairline bg-surface p-4.5 space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text">
                  Point-of-Care Order Center (Interactive Actions)
                </h4>
                <span className="text-[11px] text-subtext">
                  Click below to execute one-click clinical decisions in this consultation.
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber">One-Click EHR Protocol</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Action 1: Maintain Active Dose */}
              <div className="rounded-lg border border-hairline bg-ground/80 p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">1. Dose Escalation Decision</span>
                    {doseOrderState === "maintained" && (
                      <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                        ✓ Escalation Prevented
                      </span>
                    )}
                    {doseOrderState === "escalated" && (
                      <span className="rounded bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 text-[10px] font-mono text-rose-300">
                        ⚠ Dose Escalated
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-subtext mt-1 leading-relaxed">
                    Choose whether to escalate or maintain current dose strength.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setDoseOrderState("maintained")}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
                      doseOrderState === "maintained"
                        ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400"
                        : "bg-surface border border-hairline text-text hover:border-emerald-500/60 hover:text-emerald-300"
                    }`}
                  >
                    ✓ Maintain Dose (Decline Escalation)
                  </button>
                  <button
                    onClick={() => setDoseOrderState("escalated")}
                    className={`rounded-md px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
                      doseOrderState === "escalated"
                        ? "bg-rose-700 text-white shadow-md ring-2 ring-rose-400"
                        : "bg-surface border border-hairline text-subtext hover:border-rose-500/60 hover:text-rose-300"
                    }`}
                  >
                    Escalate Dose
                  </button>
                </div>

                {doseOrderState === "maintained" && (
                  <div className="rounded border border-emerald-500/30 bg-emerald-950/30 p-2 text-[11px] text-emerald-200 mt-1">
                    ✓ Clinical order placed: Current dose maintained. Patient protected against outpatient hypotensive toxicity.
                  </div>
                )}
                {doseOrderState === "escalated" && (
                  <div className="rounded border border-rose-500/30 bg-rose-950/30 p-2 text-[11px] text-rose-200 mt-1">
                    ⚠ Warning logged: Provider elected to increase dosage despite white-coat surge telemetry.
                  </div>
                )}
              </div>

              {/* Action 2: Co-Pay Assistance Referral */}
              <div className="rounded-lg border border-hairline bg-ground/80 p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">2. Co-Pay Assistance Referral</span>
                    {copayDispatched && (
                      <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                        Dispatched
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-subtext mt-1 leading-relaxed">
                    Auto-enroll patient in manufacturer copay card ($0 out-of-pocket).
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setCopayDispatched((v) => !v)}
                    className={`w-full rounded-md px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
                      copayDispatched
                        ? "bg-amber text-ground font-semibold shadow-md"
                        : "bg-surface border border-hairline text-text hover:border-amber/60 hover:text-amber"
                    }`}
                  >
                    {copayDispatched ? "✓ $0 Co-Pay Card Dispatched to Pharmacy" : "📋 Send Pharmacy Co-Pay Aid"}
                  </button>
                </div>

                {copayDispatched && (
                  <div className="rounded border border-amber/30 bg-amber/10 p-2 text-[11px] text-amber mt-1">
                    Discount card queued. Patient companion app will notify Robert with his $15 coupon code.
                  </div>
                )}
              </div>

              {/* Action 3: Dispatch Smart Pill Cap Dispenser */}
              <div className="rounded-lg border border-hairline bg-ground/80 p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">3. Smart Pill Bottle Dispenser</span>
                    {smartCapOrdered && (
                      <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                        Shipped
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-subtext mt-1 leading-relaxed">
                    Ship Bluetooth-enabled pill cap to eliminate future unmonitored lapses.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSmartCapOrdered((v) => !v)}
                    className={`w-full rounded-md px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
                      smartCapOrdered
                        ? "bg-amber text-ground font-semibold shadow-md"
                        : "bg-surface border border-hairline text-text hover:border-amber/60 hover:text-amber"
                    }`}
                  >
                    {smartCapOrdered ? "✓ 30-Day Smart Cap Ordered" : "💊 Order Smart Pill Cap"}
                  </button>
                </div>

                {smartCapOrdered && (
                  <div className="rounded border border-amber/30 bg-amber/10 p-2 text-[11px] text-amber mt-1">
                    Dispenser ordered to patient home. Integrates with CarePulse companion app.
                  </div>
                )}
              </div>

              {/* Action 4: Auto-Insert Progress Note into EHR Chart */}
              <div className="rounded-lg border border-hairline bg-ground/80 p-3.5 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text">4. Auto-Generate Clinical Chart Note</span>
                    {noteInserted && (
                      <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                        In Chart
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-subtext mt-1 leading-relaxed">
                    Insert formatted non-judgmental justification note into official EHR record.
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setNoteInserted((v) => !v)}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium cursor-pointer transition-all ${
                      noteInserted
                        ? "bg-emerald-600 text-white font-semibold shadow-md"
                        : "bg-surface border border-hairline text-text hover:border-hairline/80 hover:text-text"
                    }`}
                  >
                    {noteInserted ? "✓ Chart Note Saved" : "📝 Insert Note to EHR"}
                  </button>
                  <button
                    onClick={handleCopyNote}
                    className="rounded-md border border-hairline bg-surface px-3 py-2 text-xs text-subtext hover:text-text cursor-pointer"
                  >
                    {copiedNote ? "Copied!" : "Copy Text"}
                  </button>
                </div>

                {noteInserted && (
                  <div className="rounded border border-emerald-500/30 bg-emerald-950/30 p-2 text-[11px] text-emerald-200 mt-1">
                    Note appended to encounter #4829104. Fully compliant with hospital audit guidelines.
                  </div>
                )}
              </div>
            </div>

            {/* Note Preview Expansion */}
            {noteInserted && (
              <div className="mt-3 rounded-lg border border-hairline bg-ground p-3 text-xs space-y-2">
                <span className="text-[10px] font-mono uppercase text-amber tracking-wider block">
                  Inserted EHR Chart Documentation (Read-Only Preview):
                </span>
                <pre className="font-mono text-[11px] text-text whitespace-pre-wrap leading-relaxed overflow-x-auto bg-[#0A0E13] p-3 rounded border border-hairline">
                  {progressNoteText}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
