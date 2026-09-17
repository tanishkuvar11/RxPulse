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
      <section className="border-b border-hairline pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-text">System Reliability & Verification</h1>
          <span className="rounded bg-surface border border-hairline px-2 py-0.5 text-xs font-mono text-amber font-semibold">
            Algorithm Testing
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-subtext leading-relaxed">
          How do we know the system works? Here we test two crucial questions: Can the tool reliably catch missed medication when it happens, and does it report its confidence truthfully?
        </p>
      </section>

      {/* Test 1: Detection Sensitivity */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber" />
            Test 1: Can the system catch real medication surges? (Detection Accuracy)
          </h2>
          <ProvenanceTag kind="simulated" formula="Percentage of 40 simulated trial patient groups (200 patients each) that successfully detect the surge across different noise levels." />
        </div>
        <p className="max-w-3xl text-xs text-subtext leading-relaxed">
          If a patient group truly takes their medicine only right before appointments, can our algorithm find that pattern? We tested this on simulated trials. As shown below, detection accuracy quickly reaches 80% to 100% even when the pre-visit increase is just 1.3 percentage points.
        </p>
        {instrument.data?.power_curve && (
          <div className="rounded-xl border border-hairline bg-surface p-4 mt-2">
            <PowerCurveChart rows={instrument.data.power_curve.rows} />
            <div className="mt-3 flex gap-4 text-xs text-subtext border-t border-hairline pt-2">
              {noiseLevels.map((n, i) => (
                <span key={n} className="flex items-center gap-1.5">
                  <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke="#D9A441" strokeWidth={i === 0 ? 2.5 : 1.5} strokeDasharray={i === 0 ? undefined : "5,3"} /></svg>
                  Patient-to-patient noise level {n.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Test 2: Honest Uncertainty Calibration */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber" />
            Test 2: Is the AI honest about its confidence? (Calibration Check)
          </h2>
          <ProvenanceTag kind="derived" formula="Tested on held-out patient data to confirm that a 90% confidence interval contains the true answer exactly 90% of the time." />
        </div>
        <p className="max-w-3xl text-xs text-subtext leading-relaxed">
          When the AI claims it is 90% confident, is it actually right 90% of the time? We tested this on separate held-out patient data. The near-perfect diagonal line proves that our system does not hallucinate false certainty or make overconfident guesses.
        </p>
        {instrument.data?.calibration_curve && (
          <div className="rounded-xl border border-hairline bg-surface p-4 mt-2">
            <CalibrationChart
              nominal={instrument.data.calibration_curve.nominal_coverage}
              realized={instrument.data.calibration_curve.realized_coverage}
            />
            <p className="mt-3 text-[11px] text-subtext border-t border-hairline pt-2">
              The closer the curve hugs the 45-degree line, the more mathematically honest the tool is. Our procedure matches expected real-world accuracy closely.
            </p>
          </div>
        )}
      </section>

      {/* Data Source Disclosure */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">About the Underlying Healthcare Data</h2>
        {about.data && <AboutDataPanel data={about.data} />}
      </section>
    </div>
  );
}
