import type { ConformalInfo } from "../lib/types";
import { pctPoint } from "../lib/format";
import { ProvenanceTag } from "./Provenance";

export function ConformalCard({ conformal, nFills }: { conformal: ConformalInfo | null; nFills: number }) {
  if (!conformal) {
    return (
      <div className="rounded-xl border border-hairline bg-surface p-4 text-xs text-subtext">
        No confidence interval available for this patient.
      </div>
    );
  }

  if (conformal.abstain) {
    return (
      <div className="rounded-xl border border-amber/40 bg-amber/5 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber" />
            Prediction Safely Withheld (AI Abstention)
          </span>
        </div>
        <p className="text-xs text-text leading-relaxed">
          This patient has only {nFills} refill records in the study window. Because the 90% confidence range would be too wide ({pctPoint(conformal.interval_lo)} to {pctPoint(conformal.interval_hi)}), the AI safely refuses to make a guess rather than risking an inaccurate accusation.
        </p>
        <p className="text-[11px] text-subtext">
          Safety First: The model only alerts physicians when statistical evidence is solid.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text uppercase tracking-wider">
          AI Confidence Rating (90% Reliable Range)
        </h3>
        <ProvenanceTag kind="derived" formula="Split-conformal prediction: guarantees 90% statistical coverage on real held-out patient data." />
      </div>
      <div className="tabular text-2xl font-bold text-amber">{pctPoint(conformal.predicted_lift)}</div>
      <div className="tabular text-xs text-subtext">
        90% Confident Range: {pctPoint(conformal.interval_lo)} to {pctPoint(conformal.interval_hi)}
      </div>
      <p className="text-[11px] text-subtext leading-relaxed pt-1 border-t border-hairline/60">
        Mathematically calibrated on held-out patient data so doctors can trust the uncertainty boundaries.
      </p>
    </div>
  );
}
