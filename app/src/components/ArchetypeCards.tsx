import type { ArchetypeCluster } from "../lib/types";
import { ProvenanceTag } from "./Provenance";

const FEATURE_LABELS: Record<string, string> = {
  pdc: "Overall Coverage Rate (PDC)",
  n_gaps_ge7: "Gaps Lasting 7+ Days",
  longest_gap: "Longest Break (Days)",
  gap_skew: "Spacing Pattern",
  pre_appointment_lift: "Pre-Visit Refill Surge",
  cv_inter_fill_interval: "Refill Irregularity",
  linear_trend: "Trend Over Time",
  day_of_week_effect: "Day-of-Week Effect",
};

export function ArchetypeCards({ clusters }: { clusters: ArchetypeCluster[] }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clusters.map((c) => (
          <div key={c.cluster} className="rounded-xl border border-hairline bg-surface p-5 space-y-3 shadow-sm">
            <div className="flex items-baseline justify-between border-b border-hairline pb-2">
              <h3 className="text-sm font-semibold capitalize text-text">{c.label}</h3>
              <span className="tabular text-xs font-mono text-amber font-medium">
                {c.n.toLocaleString()} patients
              </span>
            </div>
            <dl className="space-y-1.5 pt-1">
              {Object.entries(c.centroid).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <dt className="text-subtext">{FEATURE_LABELS[k] ?? k}</dt>
                  <dd className="tabular font-mono text-text">{v.toFixed(3)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-subtext flex items-center justify-between">
        <span>Behavior clustering discovered from 8 mathematical features per patient.</span>
        <ProvenanceTag kind="derived" formula="Gaussian mixture model grouping (k=6) discovering natural medication habits." />
      </div>
    </div>
  );
}
