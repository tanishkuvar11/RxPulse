import type { Hypothesis, NextObservation } from "../lib/types";
import { titleCase } from "../lib/format";
import { ProvenanceTag } from "./Provenance";

const VERDICT_STYLE: Record<Hypothesis["verdict"], { label: string; style: string }> = {
  supported: { label: "Verified Reason", style: "border-amber/50 text-amber bg-amber/10" },
  contradicted: { label: "Ruled Out", style: "border-hairline text-subtext bg-surface" },
  "not assessable": { label: "Needs More Info", style: "border-hairline text-subtext italic bg-surface" },
};

export function HypothesisPanel({
  hypotheses,
  nextObservations,
}: {
  hypotheses: Hypothesis[];
  nextObservations: NextObservation[];
}) {
  const allUnassessable = hypotheses.length > 0 && hypotheses.every((h) => h.verdict === "not assessable");

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-hairline pb-2">
        <h3 className="text-sm font-semibold text-text">
          Fair Care Check: Investigating Valid Explanations
        </h3>
        <ProvenanceTag kind="derived" formula="Checked against hospital claims, insurance enrollment, and pharmacy records." />
      </div>

      <p className="text-xs text-subtext leading-relaxed">
        Before assuming a patient neglected their medication, we check whether missed refills were caused by hospital stays, insurance disruptions, or medication switches.
      </p>

      {allUnassessable && (
        <p className="mt-2 rounded-md border border-hairline bg-ground px-3 py-2 text-xs text-subtext">
          There are not enough records to evaluate these possibilities for this patient. The system conservatively makes no assumptions.
        </p>
      )}

      <ul className="space-y-2.5">
        {hypotheses.map((h) => {
          const config = VERDICT_STYLE[h.verdict] || { label: h.verdict, style: "text-subtext" };
          const cleanEvidence = h.evidence.replace(/—/g, ": ").replace(/--/g, ": ");
          return (
            <li key={h.hypothesis} className="flex items-start gap-3 rounded-lg border border-hairline/60 bg-ground/60 p-3">
              <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-[10px] font-mono font-semibold ${config.style}`}>
                {config.label}
              </span>
              <div>
                <div className="text-xs font-semibold text-text">{titleCase(h.hypothesis)}</div>
                <div className="text-xs text-subtext mt-0.5 leading-relaxed">{cleanEvidence}</div>
              </div>
            </li>
          );
        })}
      </ul>

      {nextObservations.length > 0 && (
        <div className="mt-4 border-t border-hairline pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-text">
              Recommended Next Clinical Step (How to Clear Up Doubt)
            </h4>
            <ProvenanceTag kind="derived" formula="Ranked by how much diagnostic uncertainty each observation clears up." />
          </div>
          <ul className="space-y-1.5">
            {nextObservations.map((o) => {
              const cleanObs = o.observation.replace(/—/g, ": ").replace(/--/g, ": ");
              return (
                <li key={o.observation} className="flex items-center justify-between rounded border border-hairline/50 bg-ground/40 px-3 py-2 text-xs">
                  <span className="text-text font-medium">{titleCase(cleanObs)}</span>
                  <span className="text-[11px] font-mono text-amber">
                    Clears up diagnostic doubt
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
