import { useData } from "../lib/useData";
import type { CohortCurveData, FunnelData, ArchetypesData } from "../lib/types";
import { PhaseCurveChart } from "../components/PhaseCurveChart";
import { FunnelTable } from "../components/FunnelTable";
import { ArchetypeCards } from "../components/ArchetypeCards";
import { ProvenanceTag } from "../components/Provenance";
import { pctPoint, fmtP } from "../lib/format";

export default function CohortView() {
  const curve = useData<CohortCurveData>("cohort_curve.json");
  const funnel = useData<FunnelData>("funnel.json");
  const archetypes = useData<ArchetypesData>("archetypes.json");

  const result = curve.data?.result;
  const ciCrossesZero = result ? result.ci_lo <= 0 && result.ci_hi >= 0 : true;
  const isMeaningfulEffect = result ? Math.abs(result.observed_lift) >= 0.02 && !ciCrossesZero : false;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold text-text">Cohort</h1>
        <p className="mt-1 max-w-2xl text-sm text-subtext">
          Coverage averaged across every patient and every one of their appointments, aligned to
          days-relative-to-visit, with the permutation null shown behind it -- not just quoted as a
          p-value.
        </p>
      </section>

      <section>
        {curve.loading && <p className="text-sm text-subtext">Loading...</p>}
        {curve.error && <p className="text-sm text-subtext">{curve.error}</p>}
        {curve.data && result && (
          <>
            <PhaseCurveChart
              points={curve.data.offsets.map((o, i) => ({ offset: o, value: curve.data!.mean_coverage[i] }))}
              nullBand={result.null_band_95}
              nearBand={curve.data.near_band}
              farBand={curve.data.far_band}
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="Pre-appointment lift" value={pctPoint(result.observed_lift)} sub={`95% CI ${pctPoint(result.ci_lo)} to ${pctPoint(result.ci_hi)}`} />
              <Stat label="Permutation test" value={fmtP(result.p_value)} sub={`${result.n_permutations.toLocaleString()} shuffles of each patient's own visit calendar`} />
              <Stat label="Cohort size" value={`${result.n_pairs.toLocaleString()} pairs`} sub="patient-ingredient pairs with >=1 real appointment" />
            </div>
            <div className="mt-4 rounded-lg border border-hairline bg-surface p-4 text-sm leading-relaxed text-text">
              {isMeaningfulEffect ? (
                <p>
                  Coverage rose {pctPoint(result.observed_lift)} in the two weeks before a visit
                  compared to a baseline period 31-60 days out. That is distinguishable from the
                  null distribution built by shuffling each patient's own appointments
                  ({fmtP(result.p_value)}).
                </p>
              ) : (
                <div className="space-y-2">
                  <p>
                    The measured lift is {pctPoint(result.observed_lift)}. Two checks on it disagree
                    in an informative way. The permutation test -- which pools every coverage-day
                    across every patient -- finds this tiny shift distinguishable from a shuffled
                    null ({fmtP(result.p_value)}), because pooling millions of days gives it the
                    power to detect even a minuscule average shift.
                  </p>
                  <p>
                    But the patient-level bootstrap, which treats each patient as the unit of
                    evidence rather than each day, gives a 95% interval of{" "}
                    {pctPoint(result.ci_lo)} to {pctPoint(result.ci_hi)} --{" "}
                    {ciCrossesZero ? "spanning zero" : "not spanning zero"}. Read together, the
                    honest conclusion is that this cohort does not show a pre-appointment
                    adherence pattern large or consistent enough to act on. This is a real result
                    on real (synthetic) data, not an error. The Instrument screen shows this same
                    detector's sensitivity on data with a known injected effect, for comparison.
                  </p>
                </div>
              )}
              <div className="mt-2">
                <ProvenanceTag kind="derived" formula="mean coverage in [-14,-1] days minus mean coverage in [-60,-31] days, pooled over every patient-ingredient pair and every encounter." />
              </div>
            </div>
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-text">Cohort selection</h2>
        {funnel.data && <div className="mt-3"><FunnelTable steps={funnel.data.steps} /></div>}
      </section>

      <section>
        <h2 className="text-lg font-medium text-text">Adherence archetypes</h2>
        {archetypes.data && <div className="mt-3"><ArchetypeCards clusters={archetypes.data.clusters} /></div>}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface p-4">
      <div className="text-xs text-subtext">{label}</div>
      <div className="tabular mt-1 text-xl text-amber">{value}</div>
      <div className="mt-1 text-xs text-subtext">{sub}</div>
    </div>
  );
}
