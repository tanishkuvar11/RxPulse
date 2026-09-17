import type { ArchetypeCluster } from "../lib/types";
import { ProvenanceTag } from "./Provenance";

const FEATURE_LABELS: Record<string, string> = {
  pdc: "PDC",
  n_gaps_ge7: "gaps ≥ 7d",
  longest_gap: "longest gap (d)",
  gap_skew: "gap skew",
  pre_appointment_lift: "pre-visit lift",
  cv_inter_fill_interval: "refill irregularity",
  linear_trend: "trend",
  day_of_week_effect: "day-of-week effect",
};

/** Archetype cards: the label plus the centroid that produced it, side by side, so the
 * naming is inspectable rather than trusted. */
export function ArchetypeCards({ clusters }: { clusters: ArchetypeCluster[] }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clusters.map((c) => (
          <div key={c.cluster} className="rounded-lg border border-hairline bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-medium capitalize text-text">{c.label}</h3>
              <span className="tabular text-xs text-subtext">n={c.n}</span>
            </div>
            <dl className="mt-3 space-y-1">
              {Object.entries(c.centroid).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <dt className="text-subtext">{FEATURE_LABELS[k] ?? k}</dt>
                  <dd className="tabular text-text">{v.toFixed(3)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-subtext">
        adherence archetypes <ProvenanceTag kind="derived" formula="Gaussian mixture (k chosen by BIC, k<=6) over 8 standardized per-patient features. Labels are a fixed rule applied to each cluster's centroid, not model output." />
      </div>
    </div>
  );
}
