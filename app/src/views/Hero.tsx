import { Link } from "react-router-dom";
import { useData } from "../lib/useData";
import type { PatientsData } from "../lib/types";
import { AxisTransition } from "../components/AxisTransition";
import { titleCase } from "../lib/format";

export default function Hero() {
  const { data, loading, error } = useData<PatientsData>("patients.json");
  const patient = data?.patients?.slice().sort((a, b) => (b.pre_appointment_lift ?? -1) - (a.pre_appointment_lift ?? -1))[0];

  return (
    <div className="space-y-10">
      {/* Hackathon Header Badge & Main Title */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-amber/50 bg-amber/10 px-3 py-0.5 text-xs font-mono font-semibold text-amber">
            Manipal Hackathon 2026: Healthcare Track (P01)
          </span>
          <span className="rounded-full border border-hairline bg-surface px-3 py-0.5 text-xs text-subtext font-mono">
            Medicare Claims + Wearables + Clinical Vitals
          </span>
        </div>

        <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-text sm:text-5xl leading-tight">
          When blood pressure stays high, doctors often <span className="text-amber">increase the dose</span>.
        </h1>

        <p className="max-w-3xl text-base leading-relaxed text-subtext sm:text-lg">
          If the real issue is missed doses, increasing the strength can be dangerous the moment the patient starts taking the pills again. <strong className="text-text">Vanishing Dose</strong> combines pharmacy refills, smartwatch heart rate patterns, and clinic test results to tell whether a medicine is failing or simply not being taken, without judging or blaming the patient.
        </p>
      </section>

      {/* The 30-Second Clinical Problem in Plain English */}
      <section className="rounded-xl border border-hairline bg-surface p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber animate-pulse" />
          The Clinical Dilemma in 30 Seconds
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-rose-500/30 bg-ground/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                Standard Practice (The Risk)
              </span>
              <span className="text-[10px] rounded bg-rose-950/40 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 font-mono">
                High Risk
              </span>
            </div>
            <p className="text-xs text-text leading-relaxed">
              A patient visits the clinic with high blood pressure. The doctor assumes the current medication is too weak and doubles the prescription.
            </p>
            <p className="text-[11px] text-rose-300/90 font-medium">
              ⚠️ The Hazard: If the patient had missed doses for weeks, taking a double dose once they get home can trigger dangerous blood pressure drops, dizziness, or emergency room visits.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-500/30 bg-ground/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                Vanishing Dose (The Solution)
              </span>
              <span className="text-[10px] rounded bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 font-mono">
                Safe & Compassionate
              </span>
            </div>
            <p className="text-xs text-text leading-relaxed">
              Our system notices an unmedicated 22-day refill gap, confirmed by elevated resting heart rate on their smartwatch, followed by a rush to refill pills right before the doctor visit.
            </p>
            <p className="text-[11px] text-emerald-300/90 font-medium">
              ✅ The Action: Issues a clear <span className="underline font-bold">DO NOT INCREASE DOSE</span> alert and gives the doctor supportive conversation questions to explore refill obstacles.
            </p>
          </div>
        </div>
      </section>

      {/* Core Highlights */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-hairline bg-surface p-5 space-y-2">
          <div className="text-amber font-mono text-xs font-semibold uppercase">01: Multiple Daily Signals</div>
          <h3 className="text-sm font-semibold text-text">No Extra Work for Patients</h3>
          <p className="text-xs text-subtext leading-relaxed">
            Connects routine pharmacy refill history, smartwatch heart rate patterns, daily steps, and regular clinic blood tests into one unified timeline.
          </p>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-5 space-y-2">
          <div className="text-amber font-mono text-xs font-semibold uppercase">02: Compassionate Care</div>
          <h3 className="text-sm font-semibold text-text">Understanding Real Obstacles</h3>
          <p className="text-xs text-subtext leading-relaxed">
            Checks valid reasons like hospital stays, prescription changes, and pharmacy co-pay costs before ever assuming a patient simply forgot their medicine.
          </p>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-5 space-y-2">
          <div className="text-amber font-mono text-xs font-semibold uppercase">03: Safe & Honest AI</div>
          <h3 className="text-sm font-semibold text-text">Refuses to Guess When Unsure</h3>
          <p className="text-xs text-subtext leading-relaxed">
            Uses mathematical confidence boundaries. If a patient does not have enough refill history, the AI clearly says it does not have enough information rather than guessing.
          </p>
        </div>
      </section>

      {/* Visual Transition: One Patient, Two Lenses */}
      <section className="rounded-xl border border-hairline bg-surface p-6 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber" />
            Interactive Demonstration: One Patient, Two Lenses
          </h2>
          <span className="text-xs text-subtext font-mono">Phase Alignment Visualizer</span>
        </div>
        <p className="text-xs text-subtext max-w-2xl leading-relaxed">
          Watch this patient's 3-year history transform. First see it in regular calendar order, then click the button to fold the days relative to their scheduled doctor visits.
        </p>

        {loading && <p className="text-sm text-subtext">Loading patient history...</p>}
        {error && <p className="text-sm text-rose-400">Could not load patient data: {error}</p>}
        {patient && (
          <div className="mt-4 pt-2">
            <AxisTransition
              dates={patient.coverage_dates}
              status={patient.coverage_status}
              encounterDates={patient.encounter_dates}
            />
            <div className="mt-4 flex items-center justify-between text-xs text-subtext border-t border-hairline pt-3">
              <span>
                Demonstration on: <strong className="text-text">{titleCase(patient.ingredient)}</strong> ({patient.drug_class.replace(/_/g, " ")})
              </span>
              <span className="text-amber font-mono font-medium">
                Pre-Visit Refill Surge: +{((patient.pre_appointment_lift ?? 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Quick Launch Action Buttons */}
      <section className="flex flex-wrap gap-3 pt-2">
        <Link
          to="/simulator"
          className="rounded-lg border border-amber bg-amber px-5 py-2.5 text-sm font-semibold text-ground hover:bg-amber/90 transition-all shadow-md flex items-center gap-2"
        >
          <span>Launch Live Simulator (Interactive Demo)</span>
          <span>→</span>
        </Link>
        <Link
          to="/patient"
          className="rounded-lg border border-hairline bg-surface px-5 py-2.5 text-sm font-medium text-text hover:border-amber transition-all"
        >
          Explore Real Patient Cases →
        </Link>
        <Link
          to="/cohort"
          className="rounded-lg border border-hairline bg-surface px-5 py-2.5 text-sm font-medium text-text hover:border-amber transition-all"
        >
          View Population Analysis →
        </Link>
      </section>
    </div>
  );
}
