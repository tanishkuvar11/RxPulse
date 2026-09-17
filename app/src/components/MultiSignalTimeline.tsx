import { useState, useRef } from "react";
import type { VitalsEntry, WearableDay } from "../lib/types";
import { STATUS_CENSORED, STATUS_COVERED } from "../lib/types";
import { ProvenanceTag } from "./Provenance";

export function MultiSignalTimeline({
  dates,
  status,
  encounterDates = [],
  vitals = [],
  wearables = [],
  patternId,
}: {
  dates: string[];
  status: number[];
  encounterDates?: string[];
  vitals?: VitalsEntry[];
  wearables?: WearableDay[];
  patternId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedEncounter, setSelectedEncounter] = useState<VitalsEntry | null>(null);

  const n = dates.length;
  if (n === 0) return null;

  const encounterMap = new Map<string, VitalsEntry>();
  vitals.forEach((v) => encounterMap.set(v.date, v));
  const encounterSet = new Set(encounterDates);

  // Compute heart rate range
  const hrValues = wearables.map((w) => w.resting_heart_rate);
  const minHr = Math.max(50, Math.floor(Math.min(...(hrValues.length ? hrValues : [60])) - 5));
  const maxHr = Math.min(110, Math.ceil(Math.max(...(hrValues.length ? hrValues : [85])) + 5));

  // Build SVG polyline for heart rate on a 1000x70 coordinate grid
  const hrPoints = wearables.map((w, i) => {
    const x = (i / (n - 1 || 1)) * 1000;
    const y = 58 - ((w.resting_heart_rate - minHr) / (maxHr - minHr || 1)) * 48;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  // Normal baseline position (~70 bpm)
  const normY = 58 - ((70 - minHr) / (maxHr - minHr || 1)) * 48;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const idx = Math.min(n - 1, Math.floor(pct * n));
    setHoverIndex(idx);
  };

  const activeDate = hoverIndex !== null ? dates[hoverIndex] : null;
  const activeStatus = hoverIndex !== null ? status[hoverIndex] : null;
  const activeWearable = hoverIndex !== null && wearables[hoverIndex] ? wearables[hoverIndex] : null;
  const activeVital = activeDate ? encounterMap.get(activeDate) : null;

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
        <div>
          <h3 className="text-sm font-semibold text-text flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber" />
            Patient Health Timeline (3-Year History)
          </h3>
          <p className="mt-0.5 text-xs text-subtext">
            Comparing three everyday health signals: Doctor Visits, Prescription Refills, and Smartwatch Heart Rate.
          </p>
        </div>
        <ProvenanceTag kind="measured" formula="Encounter & claims from CMS Medicare data; continuous resting heart rate from wearable sensors." />
      </div>

      {/* Main Interactive Timeline Canvas */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
        className="relative cursor-crosshair select-none pt-6 pb-2"
      >
        {/* Layer 1: Doctor Visit Pins */}
        <div className="relative h-6 w-full">
          {dates.map((d, i) => {
            if (!encounterSet.has(d)) return null;
            const vital = encounterMap.get(d);
            const leftPct = (i / n) * 100;
            return (
              <div
                key={d}
                onClick={(e) => {
                  e.stopPropagation();
                  if (vital) setSelectedEncounter(vital);
                }}
                className="group absolute top-0 -translate-x-1/2 cursor-pointer z-10"
                style={{ left: `${leftPct}%` }}
                title={`Click to view doctor visit notes from ${d}`}
              >
                <div className="flex flex-col items-center">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber text-[10px] font-bold text-ground shadow ring-2 ring-ground transition-transform group-hover:scale-125">
                    +
                  </div>
                  <div className="h-2 w-0.5 bg-amber/80" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Layer 2: Medication Refill Coverage Strip */}
        <div className="relative mt-2 w-full rounded-md overflow-hidden border border-hairline/60 shadow-inner">
          <div className="absolute left-2 top-1.5 z-10 text-[10px] font-mono uppercase tracking-wider text-text/90 bg-ground/85 px-2 py-0.5 rounded border border-hairline/60 backdrop-blur">
            Track 1: Daily Pill Supply (Did the patient have medicine?)
          </div>
          <svg width="100%" height={32} viewBox="0 0 100 10" preserveAspectRatio="none" className="block">
            <defs>
              <pattern id={patternId} width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="4" height="4" fill="#24313C" />
                <line x1="0" y1="0" x2="0" y2="4" stroke="#D9A441" strokeWidth="1" opacity="0.6" />
              </pattern>
            </defs>
            {status.map((s, i) => {
              const fill = s === STATUS_COVERED ? "#D9A441" : s === STATUS_CENSORED ? `url(#${patternId})` : "#1B252E";
              const w = 100 / n;
              return <rect key={i} x={i * w} y={0} width={w + 0.05} height={10} fill={fill} />;
            })}
          </svg>
        </div>

        {/* Layer 3: Smartwatch Resting Heart Rate Waveform */}
        {wearables.length > 0 && (
          <div className="relative mt-3 w-full rounded-lg border border-hairline/60 bg-ground/90 p-3 pt-6 shadow-inner">
            <div className="absolute left-3 top-2 flex items-center gap-2 text-[10px] font-mono text-subtext">
              <span className="uppercase tracking-wider text-amber font-semibold">Track 2: Smartwatch Telemetry</span>
              <span>·</span>
              <span>Daily Resting Heart Rate ({minHr} to {maxHr} bpm)</span>
            </div>

            <svg width="100%" height={75} viewBox="0 0 1000 70" preserveAspectRatio="none" className="block overflow-visible">
              <defs>
                <linearGradient id={`hr-gradient-${patternId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D9A441" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#D9A441" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* 70 bpm Reference Line */}
              <line
                x1={0}
                y1={normY}
                x2={1000}
                y2={normY}
                stroke="#334350"
                strokeDasharray="4,4"
                strokeWidth={1}
              />

              {/* Smooth Clean Heart Rate Line */}
              <polyline
                fill="none"
                stroke="#D9A441"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                points={hrPoints}
              />
            </svg>

            {/* Scale labels */}
            <div className="flex justify-between text-[10px] font-mono text-subtext mt-1.5 border-t border-hairline/40 pt-1">
              <span>{dates[0]} (Study Start)</span>
              <span className="text-amber">70 bpm Normal Healthy Resting Level</span>
              <span>{dates[n - 1]} (Study End)</span>
            </div>
          </div>
        )}

        {/* Hover Inspection Line */}
        {hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/80 shadow-lg z-20"
            style={{ left: `${(hoverIndex / n) * 100}%` }}
          >
            <div className="absolute -top-6 -translate-x-1/2 rounded bg-ground border border-hairline px-2 py-0.5 text-[10px] font-mono text-text shadow backdrop-blur whitespace-nowrap">
              {activeDate}
            </div>
          </div>
        )}
      </div>

      {/* Live Hover Details Box */}
      {hoverIndex !== null && (
        <div className="rounded-lg border border-amber/40 bg-ground p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn">
          <div>
            <span className="text-[10px] text-subtext uppercase block">Selected Date</span>
            <span className="font-mono font-semibold text-text">{activeDate}</span>
          </div>
          <div>
            <span className="text-[10px] text-subtext uppercase block">Pill Availability</span>
            <span className={`font-semibold ${activeStatus === STATUS_COVERED ? "text-amber" : activeStatus === STATUS_CENSORED ? "text-subtext" : "text-rose-400"}`}>
              {activeStatus === STATUS_COVERED ? "Pills in Hand (Covered)" : activeStatus === STATUS_CENSORED ? "In Hospital (Nurse Given)" : "Out of Pills (Gap)"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-subtext uppercase block">Resting Heart Rate</span>
            <span className="font-mono font-semibold text-amber">
              {activeWearable ? `${activeWearable.resting_heart_rate} bpm` : "No sync"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-subtext uppercase block">Daily Walking</span>
            <span className="font-mono text-text">
              {activeWearable ? `${activeWearable.step_count.toLocaleString()} steps` : "N/A"}
            </span>
          </div>
        </div>
      )}

      {/* Friendly Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs text-subtext">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded-sm bg-amber" />
            <span className="text-text font-medium">Pills in Hand</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded-sm bg-[#1B252E] border border-hairline" />
            <span>Out of Pills (Missed Refill)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-3.5 rounded-sm bg-[#24313C] border border-amber/40" />
            <span>Hospital Stay (Excluded)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber text-[8px] font-bold text-ground">
              +
            </span>
            <span className="text-text font-medium">Doctor Appointment</span>
          </span>
        </div>
        <span className="text-[11px] text-subtext/80">
          Tip: Move your mouse across the timeline to inspect any day. Click "+" pins to view clinic visit details.
        </span>
      </div>

      {/* Doctor Visit Modal */}
      {selectedEncounter && (
        <div className="rounded-lg border border-amber/50 bg-ground p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-hairline pb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber text-xs font-bold text-ground">
                +
              </span>
              <h4 className="text-sm font-semibold text-text">
                Doctor Appointment Record for {selectedEncounter.date}
              </h4>
            </div>
            <button
              onClick={() => setSelectedEncounter(null)}
              className="text-xs text-subtext hover:text-text rounded px-2 py-0.5 border border-hairline cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded border border-hairline bg-surface p-2.5">
              <span className="text-[10px] text-subtext uppercase block">Blood Pressure at Clinic</span>
              <span className="text-sm font-mono font-bold text-amber">
                {selectedEncounter.systolic_bp && selectedEncounter.diastolic_bp
                  ? `${selectedEncounter.systolic_bp}/${selectedEncounter.diastolic_bp} mmHg`
                  : "Not recorded"}
              </span>
            </div>

            <div className="rounded border border-hairline bg-surface p-2.5">
              <span className="text-[10px] text-subtext uppercase block">Clinic Pulse Rate</span>
              <span className="text-sm font-mono font-bold text-text">
                {selectedEncounter.heart_rate ? `${selectedEncounter.heart_rate} bpm` : "N/A"}
              </span>
            </div>

            <div className="rounded border border-hairline bg-surface p-2.5 sm:col-span-2">
              <span className="text-[10px] text-subtext uppercase block">
                Lab Result ({selectedEncounter.lab_name || "Diagnostic Check"})
              </span>
              <span className="text-sm font-mono font-bold text-amber">
                {selectedEncounter.lab_value ? `${selectedEncounter.lab_value} ${selectedEncounter.lab_unit || ""}` : "Normal range"}
              </span>
            </div>
          </div>

          {selectedEncounter.doctor_notes && (
            <div className="rounded border border-hairline bg-surface/60 p-3 text-xs">
              <span className="font-semibold text-subtext uppercase tracking-wider text-[10px] block mb-1">
                Doctor Progress Notes
              </span>
              <p className="text-text leading-relaxed italic">
                "{selectedEncounter.doctor_notes}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
