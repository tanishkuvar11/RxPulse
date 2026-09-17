import { useState } from "react";
import { useData } from "../lib/useData";
import type { PatientsData } from "../lib/types";
import { CoverageStrip } from "../components/CoverageStrip";
import { ConformalCard } from "../components/ConformalCard";
import { HypothesisPanel } from "../components/HypothesisPanel";
import { ProvenanceTag } from "../components/Provenance";
import { shortId, titleCase } from "../lib/format";

export default function PatientView() {
  const { data, loading, error } = useData<PatientsData>("patients.json");
  const [selected, setSelected] = useState<string | null>(null);

  const patients = data?.patients ?? [];
  const current = patients.find((p) => p.id === selected) ?? patients[0];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-text">Patient</h1>
        <p className="mt-1 max-w-2xl text-sm text-subtext">
          A dosing calendar for one patient-ingredient at a time, the competing
          explanations checked against their real records, and the calibrated interval
          on their own pre-appointment lift -- including when that interval is withheld.
        </p>
      </section>

      {loading && <p className="text-sm text-subtext">Loading...</p>}
      {error && <p className="text-sm text-subtext">{error}</p>}

      {patients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                current?.id === p.id
                  ? "border-amber text-amber"
                  : "border-hairline text-subtext hover:text-text"
              }`}
            >
              {shortId(p.desynpuf_id)} · {p.ingredient}
              {p.conformal?.abstain ? " · withheld" : ""}
            </button>
          ))}
        </div>
      )}

      {current && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-lg border border-hairline bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium text-text">
                  {titleCase(current.ingredient)}{" "}
                  <span className="text-subtext">({current.drug_class.replace(/_/g, " ")})</span>
                </h2>
                {current.archetype && (
                  <span className="rounded border border-hairline px-2 py-0.5 text-xs capitalize text-subtext">
                    {current.archetype.label}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-subtext">
                {current.n_fills} fills over the observation window. Ticks above the strip mark real
                appointments. <ProvenanceTag kind="measured" />
              </p>
              <div className="mt-3">
                <CoverageStrip
                  dates={current.coverage_dates}
                  status={current.coverage_status}
                  encounterDates={current.encounter_dates}
                  patternId={`pattern-${current.id}`}
                />
              </div>
              <div className="mt-3 flex gap-4 text-xs text-subtext">
                <Legend swatch="#D9A441" label="covered" />
                <Legend swatch="#243039" label="uncovered" />
                <span className="flex items-center gap-1.5">
                  <span className="hatch-censored inline-block h-3 w-3 rounded-sm border border-hairline" />
                  censored (hospital stay)
                </span>
              </div>
            </div>

            <HypothesisPanel hypotheses={current.hypotheses} nextObservations={current.next_observations} />
          </div>

          <div className="space-y-6">
            <ConformalCard conformal={current.conformal} nFills={current.n_fills} />
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ background: swatch }} />
      {label}
    </span>
  );
}
