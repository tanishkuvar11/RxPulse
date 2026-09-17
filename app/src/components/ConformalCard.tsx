import type { ConformalInfo } from "../lib/types";
import { pctPoint } from "../lib/format";
import { ProvenanceTag } from "./Provenance";

/** The abstention state has to look deliberate, not broken -- a direct sentence about
 * what's missing and what would resolve it, not a greyed-out number. */
export function ConformalCard({ conformal, nFills }: { conformal: ConformalInfo | null; nFills: number }) {
  if (!conformal) {
    return (
      <div className="rounded-lg border border-hairline bg-surface p-4 text-sm text-subtext">
        No calibrated interval available for this patient.
      </div>
    );
  }

  if (conformal.abstain) {
    return (
      <div className="hatch-censored rounded-lg border border-hairline p-4">
        <div className="rounded-md bg-ground/90 p-3">
          <h3 className="text-sm font-medium text-text">Interval withheld</h3>
          <p className="mt-1.5 text-sm text-text">
            {nFills} fills across this patient's observation window is not enough to estimate a
            pre-visit effect with useful precision. The 90% interval would span{" "}
            <span className="tabular text-amber">{pctPoint(conformal.interval_lo)}</span> to{" "}
            <span className="tabular text-amber">{pctPoint(conformal.interval_hi)}</span> -- too wide
            to support a claim, so none is made.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <h3 className="text-sm font-medium text-text">
        Calibrated 90% interval <ProvenanceTag kind="derived" formula="Split-conformal, nonconformity normalized by sqrt(encounter count) -- patients with fewer encounters get a wider interval." />
      </h3>
      <div className="tabular mt-2 text-2xl text-amber">{pctPoint(conformal.predicted_lift)}</div>
      <div className="tabular mt-1 text-sm text-subtext">
        90% interval: {pctPoint(conformal.interval_lo)} to {pctPoint(conformal.interval_hi)}
      </div>
    </div>
  );
}
