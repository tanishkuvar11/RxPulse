import { useState } from "react";
import { useData } from "../lib/useData";
import type { PatientsData } from "../lib/types";
import { MultiSignalTimeline } from "../components/MultiSignalTimeline";
import { ClinicalActionBanner } from "../components/ClinicalActionBanner";
import { InconsistencyReasoner } from "../components/InconsistencyReasoner";
import { ConformalCard } from "../components/ConformalCard";
import { HypothesisPanel } from "../components/HypothesisPanel";
import { shortId, titleCase } from "../lib/format";

export default function PatientView() {
  const { data, loading, error } = useData<PatientsData>("patients.json");
  const [selected, setSelected] = useState<string | null>(null);

  const patients = data?.patients ?? [];
  const current = patients.find((p) => p.id === selected) ?? patients[0];

  return (
    <div className="space-y-8">
      {/* View Header */}
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text">Individual Patient Health Record</h1>
            <span className="rounded bg-amber/20 px-2 py-0.5 text-xs font-mono font-semibold text-amber">
              Multi-Signal Health View
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-subtext leading-relaxed">
            Bringing together pharmacy refill records, smartwatch heart rate patterns, and doctor test results to separate real medication failure from missed pills, without blaming the patient.
          </p>
        </div>
      </section>

      {loading && <p className="text-sm text-subtext">Loading patient cohort records...</p>}
      {error && <p className="text-sm text-rose-400">Failed to load patient records: {error}</p>}

      {/* Exemplar Patient Case Selector */}
      {patients.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-subtext">
            <span className="font-semibold uppercase tracking-wider">Choose a Patient Case to Review:</span>
            <span className="font-mono text-[11px]">{patients.length} Example Patient Histories Available</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {patients.map((p) => {
              const isCurrent = current?.id === p.id;
              const isSurge = (p.pre_appointment_lift ?? 0) > 0.15;
              const isAbstain = p.conformal?.abstain;
              const isDrop = (p.pre_appointment_lift ?? 0) < -0.10;

              const badgeText = isSurge
                ? "Pre-Visit Surge"
                : isAbstain
                ? "AI Abstains (Sparse)"
                : isDrop
                ? "Refill Obstacle"
                : "Steady Routine";

              const badgeColor = isSurge
                ? "text-rose-400 border-rose-500/30 bg-rose-950/20"
                : isAbstain
                ? "text-amber border-amber/30 bg-amber/10"
                : isDrop
                ? "text-amber border-amber/30 bg-amber/10"
                : "text-emerald-400 border-emerald-500/30 bg-emerald-950/20";

              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition-all ${
                    isCurrent
                      ? "border-amber bg-surface shadow-md ring-1 ring-amber/50"
                      : "border-hairline bg-surface/50 hover:border-hairline/80 hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-xs font-bold text-text">
                      {shortId(p.desynpuf_id)}
                    </span>
                    <span className={`rounded border px-1.5 py-0.2 text-[9px] font-mono font-medium ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>
                  <span className="text-xs text-amber font-medium mt-1 truncate w-full">
                    {titleCase(p.ingredient)}
                  </span>
                  <span className="text-[10px] text-subtext mt-0.5">
                    {p.n_fills} refills, {p.encounter_dates.length} doctor visits
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {current && (
        <div className="space-y-6">
          {/* 1. Clinical Action Alert Banner */}
          <ClinicalActionBanner
            action={current.clinical_action}
            riskLevel={current.risk_level}
            ingredient={current.ingredient}
          />

          {/* 2. Patient Profile Quick Header */}
          <div className="rounded-lg border border-hairline bg-surface p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-text">
                  Patient {shortId(current.desynpuf_id)}
                </h2>
                <span className="text-xs text-subtext font-mono">
                  (ID: {current.desynpuf_id})
                </span>
                {current.archetype && (
                  <span className="rounded border border-hairline bg-ground px-2 py-0.5 text-xs capitalize text-text font-medium">
                    Routine Pattern: {current.archetype.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-subtext">
                Prescribed Drug: <strong className="text-text">{titleCase(current.ingredient)}</strong> ({current.drug_class.replace(/_/g, " ")}) with {current.n_fills} pharmacy refills and {current.encounter_dates.length} clinic visits recorded from 2008 to 2010.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="rounded border border-hairline bg-ground px-3 py-1 text-center">
                <div className="text-[10px] text-subtext">Pre-Visit Refill Change</div>
                <div className={`text-sm font-bold ${
                  (current.pre_appointment_lift ?? 0) > 0.1 ? "text-rose-400" : "text-amber"
                }`}>
                  {current.pre_appointment_lift !== null
                    ? `${current.pre_appointment_lift > 0 ? "+" : ""}${(current.pre_appointment_lift * 100).toFixed(1)}%`
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Main Multi-Signal Longitudinal Stream */}
          <MultiSignalTimeline
            dates={current.coverage_dates}
            status={current.coverage_status}
            encounterDates={current.encounter_dates}
            vitals={current.vitals}
            wearables={current.wearables}
            patternId={`pattern-${current.id}`}
          />

          {/* 4. Cross-Signal Reasoning & Decision Support Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <InconsistencyReasoner
                signals={current.inconsistency_signals}
                prescriptionEvents={current.prescription_events}
              />
              <HypothesisPanel
                hypotheses={current.hypotheses}
                nextObservations={current.next_observations}
              />
            </div>

            <div className="space-y-6">
              <ConformalCard
                conformal={current.conformal}
                nFills={current.n_fills}
              />

              {/* Clinical Interpretation Guide Card */}
              <div className="rounded-lg border border-hairline bg-surface p-4 text-xs space-y-3">
                <h4 className="font-semibold text-text uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-amber" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Doctor's Quick Decision Guide
                </h4>
                <div className="space-y-2 text-subtext leading-relaxed">
                  <p>
                    <strong className="text-text">Pre-Visit Surge:</strong> If resting heart rate or blood pressure drops only 3 days before a visit after a long refill gap, do not increase the medication dose.
                  </p>
                  <p>
                    <strong className="text-text">AI Abstention:</strong> If the prediction is withheld, the patient does not have enough baseline refills. Ask about prescription pickup history before altering treatment.
                  </p>
                  <p>
                    <strong className="text-text">Hospital Stays Excluded:</strong> Hatched gray bars indicate inpatient hospital stays where medicine was given directly by nurses and does not count as a missed dose.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
