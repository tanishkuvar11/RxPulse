import { useMemo, useState } from "react";
import { STATUS_CENSORED, STATUS_COVERED } from "../lib/types";

interface Chip {
  key: string;
  dayI: number;
  offset: number;
  calendarStack: number;
  alignedStack: number;
  status: number;
  dateStr: string;
}

const LO = -60;
const HI = 30;
const TOTAL_OFFSET_DAYS = HI - LO; // 90

export function AxisTransition({
  dates,
  status,
  encounterDates,
}: {
  dates: string[];
  status: number[];
  encounterDates: string[];
}) {
  const [aligned, setAligned] = useState(false);

  const { chips, calendarWidth, encounters } = useMemo(() => {
    const dateToMs = (d: string) => new Date(d + "T00:00:00Z").getTime();
    const msPerDay = 86400000;
    const startMs = dateToMs(dates[0]);
    const encIdx = encounterDates.map((e) => Math.round((dateToMs(e) - startMs) / msPerDay));

    const offsetCounts = new Map<number, number>();
    const dayCounts = new Map<number, number>();
    const chips: Chip[] = [];

    encIdx.forEach((enc, encI) => {
      for (let offset = LO; offset <= HI; offset++) {
        const dayI = enc + offset;
        if (dayI < 0 || dayI >= status.length) continue;
        const s = status[dayI];

        const aliStack = offsetCounts.get(offset) ?? 0;
        offsetCounts.set(offset, aliStack + 1);

        const calStack = dayCounts.get(dayI) ?? 0;
        dayCounts.set(dayI, calStack + 1);

        chips.push({
          key: `${encI}-${offset}`,
          dayI,
          offset,
          calendarStack: calStack,
          alignedStack: aliStack,
          status: s,
          dateStr: dates[dayI] || "",
        });
      }
    });

    return {
      chips,
      calendarWidth: Math.max(1, dates.length),
      encounters: encIdx.map((idx, i) => ({
        index: idx,
        date: encounterDates[i],
        visitNum: i + 1,
      })),
    };
  }, [dates, status, encounterDates]);

  // Dimensions & Coordinates
  const plotWidth = 940;
  const marginLeft = 30;
  const baselineY = 140;
  const chipHeight = 15;
  const chipGap = 3;

  // Day 0 position in aligned mode
  const day0X = marginLeft + ((0 - LO) / TOTAL_OFFSET_DAYS) * plotWidth;

  // Pre-visit window (-14 to -1) in aligned mode
  const nearStartX = marginLeft + ((-14 - LO) / TOTAL_OFFSET_DAYS) * plotWidth;
  const nearEndX = marginLeft + ((-1 - LO) / TOTAL_OFFSET_DAYS) * plotWidth;
  const nearWidth = nearEndX - nearStartX;

  // Compute staggered Y-offsets for encounter labels to prevent text collision
  const encounterLayout = useMemo(() => {
    let lastX = -999;
    let staggered = false;
    return encounters.map((enc) => {
      const x = marginLeft + (enc.index / calendarWidth) * plotWidth;
      // If within 60px of the previous encounter, stagger downward
      if (Math.abs(x - lastX) < 65) {
        staggered = !staggered;
      } else {
        staggered = false;
      }
      lastX = x;
      return {
        ...enc,
        x,
        yOffset: staggered ? 36 : 22,
        lineLength: staggered ? 24 : 10,
      };
    });
  }, [encounters, calendarWidth]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-ground/90 p-4 shadow">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber animate-pulse" />
            Active View:{" "}
            <span className="text-amber">
              {aligned
                ? "Phase-Aligned to Scheduled Appointments (Relative Days)"
                : "Chronological Calendar (2008 – 2010)"}
            </span>
          </div>
          <p className="text-xs text-subtext">
            {aligned
              ? "All 90-day observation windows are folded onto Day 0. Notice the distinct amber coverage stack surging in the 14 days before visits."
              : "Showing the 90-day evaluation windows across the patient's 3-year timeline. Click below to see them fold into relative time."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAligned((a) => !a)}
          className="rounded-lg border border-amber bg-amber px-4 py-2 text-xs font-bold text-ground shadow-md transition-all hover:bg-amber/90 active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4 text-ground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>{aligned ? "← Return to Calendar Timeline" : "Fold & Align to Appointment Day →"}</span>
        </button>
      </div>

      {/* Main SVG Visualization Canvas */}
      <div className="relative rounded-xl border border-hairline bg-ground p-4 shadow-inner overflow-hidden">
        <svg
          width="100%"
          height={205}
          viewBox="0 0 1000 205"
          preserveAspectRatio="none"
          className="block select-none"
        >
          <defs>
            <pattern id="axis-censored-pattern-v2" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" fill="#24313C" />
              <line x1="0" y1="0" x2="0" y2="4" stroke="#D9A441" strokeWidth="1.2" opacity="0.6" />
            </pattern>
          </defs>

          {/* Full continuous 3-year background timeline ribbon on baseline */}
          <line
            x1={marginLeft}
            x2={marginLeft + plotWidth}
            y1={baselineY}
            y2={baselineY}
            stroke="#2B3844"
            strokeWidth={2}
          />

          {/* Shaded pre-appointment window in aligned mode */}
          <rect
            x={nearStartX}
            y={15}
            width={nearWidth}
            height={baselineY - 15}
            fill="#D9A441"
            rx={4}
            style={{
              transition: "opacity 500ms ease",
              opacity: aligned ? 0.15 : 0,
            }}
          />

          {aligned && (
            <text
              x={nearStartX + nearWidth / 2}
              y={26}
              textAnchor="middle"
              fill="#D9A441"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
              fontWeight="bold"
            >
              PRE-VISIT LIFT WINDOW (-14 to -1d)
            </text>
          )}

          {/* Day 0 Appointment Vertical Guideline in aligned mode */}
          <line
            x1={day0X}
            x2={day0X}
            y1={15}
            y2={baselineY + 10}
            stroke="#D9A441"
            strokeWidth={1.5}
            strokeDasharray="3,3"
            style={{
              transition: "opacity 500ms ease",
              opacity: aligned ? 0.9 : 0,
            }}
          />

          {aligned && (
            <g>
              <circle cx={day0X} cy={baselineY + 10} r={4} fill="#D9A441" />
              <text
                x={day0X}
                y={baselineY + 25}
                textAnchor="middle"
                fill="#D9A441"
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                APPOINTMENT (DAY 0)
              </text>
            </g>
          )}

          {/* In Calendar Mode: Non-colliding, staggered appointment pins */}
          {!aligned &&
            encounterLayout.map((enc) => (
              <g key={enc.visitNum}>
                {/* Pin stem */}
                <line
                  x1={enc.x}
                  x2={enc.x}
                  y1={baselineY - 2}
                  y2={baselineY + enc.lineLength}
                  stroke="#D9A441"
                  strokeWidth={1.5}
                />
                {/* Pin head */}
                <circle cx={enc.x} cy={baselineY + enc.lineLength} r={3.5} fill="#D9A441" />
                {/* Staggered text label */}
                <text
                  x={enc.x}
                  y={baselineY + enc.yOffset}
                  textAnchor="middle"
                  fill="#D9A441"
                  fontSize={9.5}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  Visit #{enc.visitNum}
                </text>
              </g>
            ))}

          {/* Render All Day Chips */}
          {chips.map((c) => {
            // Calendar coordinate (resting flat on baseline shelf)
            const calX = marginLeft + (c.dayI / calendarWidth) * plotWidth;
            const calY = baselineY - (c.calendarStack + 1) * (chipHeight + chipGap);

            // Aligned coordinate (stacking neatly around Day 0)
            const aliX = marginLeft + ((c.offset - LO) / TOTAL_OFFSET_DAYS) * plotWidth;
            const aliY = baselineY - (c.alignedStack + 1) * (chipHeight + chipGap);

            const targetX = aligned ? aliX : calX;
            const targetY = aligned ? aliY : calY;
            const targetWidth = aligned ? 8.5 : Math.max(2.5, (plotWidth / calendarWidth) * 1.5);

            const isCovered = c.status === STATUS_COVERED;
            const isCensored = c.status === STATUS_CENSORED;

            const fill = isCovered
              ? "#D9A441"
              : isCensored
              ? "url(#axis-censored-pattern-v2)"
              : "#222D36";

            const stroke = isCovered ? "#E5B252" : "#32424E";

            return (
              <rect
                key={c.key}
                x={targetX}
                y={targetY}
                width={targetWidth}
                height={chipHeight}
                rx={aligned ? 2 : 1}
                fill={fill}
                stroke={stroke}
                strokeWidth={0.6}
                style={{
                  transition: "all 900ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <title>
                  {aligned
                    ? `Offset: ${c.offset >= 0 ? "+" : ""}${c.offset} days relative to appointment (${isCovered ? "Medication Covered" : "Medication Gap"})`
                    : `Calendar Date: ${c.dateStr} (${isCovered ? "Covered" : "Gap"})`}
                </title>
              </rect>
            );
          })}
        </svg>

        {/* Axis Labels Below Canvas */}
        <div className="mt-2 flex justify-between border-t border-hairline/80 pt-2 text-xs font-mono text-subtext">
          {aligned ? (
            <>
              <span className="text-text font-medium">-60 Days (Baseline Reference)</span>
              <span className="text-amber font-semibold">▲ Pre-Appointment Surge Zone</span>
              <span className="text-text font-medium">+30 Days (Follow-Up Period)</span>
            </>
          ) : (
            <>
              <span>{dates[0]} (2008 Start)</span>
              <span className="text-amber">▲ Marked Physician Encounters (Staggered to prevent overlap)</span>
              <span>{dates[dates.length - 1]} (2010 End)</span>
            </>
          )}
        </div>
      </div>

      {/* High-Contrast Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-subtext pt-1">
        <div className="flex flex-wrap items-center gap-5">
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-4 rounded-sm bg-amber border border-amber/70 shadow-sm" />
            <span className="text-text font-medium">Covered (Pills in possession)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-4 rounded-sm bg-[#222D36] border border-[#3E505E]" />
            <span className="text-subtext font-medium">Uncovered Gap (Missed/Late Refill)</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-4 rounded-sm bg-[#24313C] border border-amber/40 relative overflow-hidden flex items-center justify-center">
              <span className="text-[9px] text-amber">///</span>
            </span>
            <span className="text-subtext font-medium">Inpatient Hospital Stay (Censored)</span>
          </span>
        </div>
        <div className="text-[11px] text-subtext">
          In aligned mode, the vertical stack height represents adherence frequency across visits.
        </div>
      </div>
    </div>
  );
}
