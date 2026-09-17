import type { InconsistencySignal, PrescriptionEvent } from "../lib/types";
import { ProvenanceTag } from "./Provenance";

export function InconsistencyReasoner({
  signals = [],
  prescriptionEvents = [],
}: {
  signals?: InconsistencySignal[];
  prescriptionEvents?: PrescriptionEvent[];
}) {
  if (signals.length === 0 && prescriptionEvents.length === 0) return null;

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
        <div>
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber" />
            Cross-Checking Clues: Comparing What the Data Tells Us
          </h3>
          <p className="mt-0.5 text-xs text-subtext">
            Connecting pharmacy refill history, smartwatch heart rate patterns, and doctor test results to find the truth.
          </p>
        </div>
        <ProvenanceTag kind="derived" formula="Multi-signal synthesis across pharmacy claims, smartwatch data, and clinical lab records." />
      </div>

      <div className="space-y-4">
        {signals.map((sig, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-4 ${
              sig.level === "critical"
                ? "border-rose-500/30 bg-ground/80"
                : sig.level === "warning"
                ? "border-amber/30 bg-ground/80"
                : "border-hairline bg-ground/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-text flex items-center gap-2">
                {sig.level === "critical" && (
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-300">
                    CLEAR MISMATCH DETECTED
                  </span>
                )}
                {sig.level === "warning" && (
                  <span className="rounded bg-amber/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber">
                    NOTICEABLE INCONSISTENCY
                  </span>
                )}
                {sig.level === "info" && (
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                    SIGNALS AGREE
                  </span>
                )}
                {sig.title.replace(/—/g, ": ").replace(/--/g, ": ")}
              </h4>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded border border-hairline/80 bg-surface/80 p-2.5">
                <span className="text-[11px] font-semibold text-amber uppercase tracking-wider block mb-1">
                  Clue 1: Pharmacy Refills
                </span>
                <p className="text-subtext leading-relaxed">
                  {sig.claims_evidence.replace(/—/g, ": ").replace(/--/g, ": ")}
                </p>
              </div>

              <div className="rounded border border-hairline/80 bg-surface/80 p-2.5">
                <span className="text-[11px] font-semibold text-amber uppercase tracking-wider block mb-1">
                  Clue 2: Smartwatch & Lab Results
                </span>
                <p className="text-subtext leading-relaxed">
                  {sig.physio_evidence.replace(/—/g, ": ").replace(/--/g, ": ")}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded border border-hairline bg-ground p-3">
              <span className="text-[11px] font-semibold text-text uppercase tracking-wider block mb-1">
                What This Means in Plain English:
              </span>
              <p className="text-xs text-text leading-relaxed font-medium">
                {sig.synthesis.replace(/—/g, ": ").replace(/--/g, ": ")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {prescriptionEvents.length > 0 && (
        <div className="pt-2 border-t border-hairline">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-subtext mb-2.5">
            Prescription & Appointment History
          </h4>
          <div className="space-y-2">
            {prescriptionEvents.map((evt, i) => (
              <div key={i} className="flex items-start justify-between rounded border border-hairline bg-ground/50 p-2.5 text-xs">
                <div>
                  <div className="font-medium text-text flex items-center gap-2">
                    <span className="text-amber font-mono">{evt.date}</span>
                    <span>·</span>
                    <span>{evt.action.replace(/—/g, ": ").replace(/--/g, ": ")}</span>
                  </div>
                  <div className="text-subtext mt-0.5">{evt.details.replace(/—/g, ": ").replace(/--/g, ": ")}</div>
                </div>
                <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-mono text-subtext">
                  {evt.dose}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
