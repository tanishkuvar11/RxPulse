import { useData } from "../lib/useData";
import type { InstrumentData, AboutData } from "../lib/types";
import { PowerCurveChart } from "../components/PowerCurveChart";
import { CalibrationChart } from "../components/CalibrationChart";
import { AboutDataPanel } from "../components/AboutDataPanel";
import { ProvenanceTag } from "../components/Provenance";

export default function InstrumentView() {
  const instrument = useData<InstrumentData>("instrument.json");
  const about = useData<AboutData>("about_data.json");
  const noiseLevels = Array.from(new Set(instrument.data?.power_curve?.rows.map((r) => r.noise_sd) ?? []));

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold text-text">Instrument</h1>
        <p className="mt-1 max-w-2xl text-sm text-subtext">
          Does the detector work at all? Statistical power on synthetic data with a known injected
          effect, and whether the calibrated intervals mean what they claim to mean on the real
          cohort's held-out data.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium text-text">
          Statistical power <ProvenanceTag kind="simulated" formula="Fraction of 40 replicate synthetic cohorts (n=200 patients each) reaching p<0.05, at each injected true effect size." />
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-subtext">
          This runs entirely on injected data -- never the real cohort -- and asks the question the
          real-cohort screen can't answer on its own: if a pre-appointment lift of a given size
          were really there, would this detector find it?
        </p>
        {instrument.data?.power_curve && (
          <div className="mt-3">
            <PowerCurveChart rows={instrument.data.power_curve.rows} />
            <div className="mt-2 flex gap-4 text-xs text-subtext">
              {noiseLevels.map((n, i) => (
                <span key={n} className="flex items-center gap-1.5">
                  <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#D9A441" strokeWidth={i === 0 ? 2.5 : 1.5} strokeDasharray={i === 0 ? undefined : "5,3"} /></svg>
                  noise sd {n.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-text">
          Interval calibration <ProvenanceTag kind="derived" formula="At each nominal coverage level, the conformal quantile is recomputed from the calibration half and applied to the held-out half of the real cohort; realized coverage is the fraction of held-out patients whose true lift fell inside." />
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-subtext">
          If the procedure is honest, a 90%-nominal interval should contain the true value about
          90% of the time. This is checked on the real cohort's held-out split -- the single most
          credibility-generating chart in the project, because it's the one place the tool grades
          its own uncertainty claims.
        </p>
        {instrument.data?.calibration_curve && (
          <div className="mt-3">
            <CalibrationChart
              nominal={instrument.data.calibration_curve.nominal_coverage}
              realized={instrument.data.calibration_curve.realized_coverage}
            />
          </div>
        )}
      </section>

      <section>{about.data && <AboutDataPanel data={about.data} />}</section>
    </div>
  );
}
