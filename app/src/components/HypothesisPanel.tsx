import type { Hypothesis, NextObservation } from "../lib/types";
import { titleCase } from "../lib/format";
import { ProvenanceTag } from "./Provenance";

const VERDICT_STYLE: Record<Hypothesis["verdict"], string> = {
  supported: "border-amber/50 text-amber",
  contradicted: "border-hairline text-subtext",
  "not assessable": "border-hairline text-subtext italic",
};

/** The competing-explanations panel. "Insufficient evidence" renders with the same
 * visual weight as a positive finding -- never greyed out, never an afterthought. */
export function HypothesisPanel({
  hypotheses,
  nextObservations,
}: {
  hypotheses: Hypothesis[];
  nextObservations: NextObservation[];
}) {
  const allUnassessable = hypotheses.length > 0 && hypotheses.every((h) => h.verdict === "not assessable");

  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <h3 className="text-sm font-medium text-text">
        Competing explanations <ProvenanceTag kind="derived" formula="Each check runs against the real inpatient, enrollment, and fill-history files for this patient." />
      </h3>
      {allUnassessable && (
        <p className="mt-2 rounded-md border border-hairline bg-ground px-3 py-2 text-sm text-text">
          None of these checks could be run with confidence for this patient. The evidence here is
          insufficient to make a claim either way.
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {hypotheses.map((h) => (
          <li key={h.hypothesis} className="flex items-start gap-3 border-b border-hairline pb-2 last:border-0">
            <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-mono ${VERDICT_STYLE[h.verdict]}`}>
              {h.verdict}
            </span>
            <div>
              <div className="text-sm text-text">{titleCase(h.hypothesis)}</div>
              <div className="text-xs text-subtext">{h.evidence}</div>
            </div>
          </li>
        ))}
      </ul>

      {nextObservations.length > 0 && (
        <div className="mt-4 border-t border-hairline pt-3">
          <h4 className="text-xs font-medium text-subtext">
            What would settle it <ProvenanceTag kind="derived" formula="Expected bits of hypothesis-posterior entropy resolved by each candidate observation, under a uniform prior on each not-assessable check." />
          </h4>
          <ul className="mt-2 space-y-1">
            {nextObservations.map((o) => (
              <li key={o.observation} className="flex items-center justify-between text-sm">
                <span className="text-text">{titleCase(o.observation)}</span>
                <span className="tabular text-xs text-amber">-{o.expected_bits_reduced} bit{o.expected_bits_reduced === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
