import type { FunnelStep } from "../lib/types";
import { ProvenanceTag } from "./Provenance";

/** Every beneficiary dropped, accounted for -- this table exists so a skeptical
 * reader can see exactly where the cohort came from, not just its final size. */
export function FunnelTable({ steps }: { steps: FunnelStep[] }) {
  const max = steps[0]?.n ?? 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {steps.map((s, i) => {
            const prev = i > 0 ? steps[i - 1].n : s.n;
            const dropped = prev - s.n;
            return (
              <tr key={s.label} className="border-b border-hairline last:border-0">
                <td className="py-2.5 pr-4 text-text">{s.label}</td>
                <td className="tabular py-2.5 pr-4 text-right text-text">{s.n.toLocaleString()}</td>
                <td className="w-1/3 py-2.5 pr-2">
                  <div className="h-2 rounded-full bg-hairline">
                    <div className="h-2 rounded-full bg-amber" style={{ width: `${(s.n / max) * 100}%` }} />
                  </div>
                </td>
                <td className="tabular py-2.5 text-right text-xs text-subtext">
                  {i > 0 && dropped > 0 ? `-${dropped.toLocaleString()}` : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-subtext">
        cohort selection funnel <ProvenanceTag kind="derived" formula="Beneficiary counts at each successive filter, applied in order, on the real Sample-1 cohort." />
      </div>
    </div>
  );
}
