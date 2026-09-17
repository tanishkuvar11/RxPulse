import { useMemo, useState } from "react";
import { STATUS_CENSORED, STATUS_COVERED } from "../lib/types";

interface Chip {
  key: string;
  calendarX: number;
  alignedX: number;
  y: number;
  status: number;
}

const LO = -60;
const HI = 30;

/** The one orchestrated motion in this app: every day that falls within -60..+30 of
 * one of this patient's real appointments starts positioned by calendar date, then --
 * on a single user click -- slides to its position relative to the nearest appointment.
 * A day near two appointments contributes one chip per appointment, matching how the
 * pooled cohort curve counts phase-aligned windows. Nothing else in the app animates. */
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

  const { chips, calendarWidth } = useMemo(() => {
    const dateToMs = (d: string) => new Date(d + "T00:00:00Z").getTime();
    const msPerDay = 86400000;
    const startMs = dateToMs(dates[0]);
    const encIdx = encounterDates.map((e) => Math.round((dateToMs(e) - startMs) / msPerDay));

    const offsetCounts = new Map<number, number>();
    const chips: Chip[] = [];
    encIdx.forEach((enc, encI) => {
      for (let offset = LO; offset <= HI; offset++) {
        const dayI = enc + offset;
        if (dayI < 0 || dayI >= status.length) continue;
        const s = status[dayI];
        const stack = offsetCounts.get(offset) ?? 0;
        offsetCounts.set(offset, stack + 1);
        chips.push({
          key: `${encI}-${offset}`,
          calendarX: dayI,
          alignedX: offset - LO,
          y: stack,
          status: s,
        });
      }
    });
    return { chips, calendarWidth: dates.length };
  }, [dates, status, encounterDates]);

  const alignedWidth = HI - LO + 1;
  const maxStack = Math.max(1, ...chips.map((c) => c.y + 1));
  const cell = 3;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-subtext">
          {aligned ? "aligned to appointment day (day 0)" : "plotted on the calendar"}
        </div>
        <button
          type="button"
          onClick={() => setAligned((a) => !a)}
          className="rounded-md border border-hairline bg-surface px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-amber"
        >
          {aligned ? "Show on calendar time" : "Align to appointment time"}
        </button>
      </div>
      <svg
        width="100%"
        height={maxStack * cell + 20}
        viewBox={`0 0 ${calendarWidth} ${maxStack * cell + 20}`}
        preserveAspectRatio="none"
        className="block overflow-visible"
      >
        <line
          x1={aligned ? (0 - LO) * (calendarWidth / alignedWidth) : 0}
          x2={aligned ? (0 - LO) * (calendarWidth / alignedWidth) : 0}
          y1={0}
          y2={maxStack * cell + 12}
          stroke="#8FA0AC"
          strokeDasharray="2,3"
          style={{ transition: "all 900ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          opacity={aligned ? 1 : 0}
        />
        {chips.map((c) => {
          const x = aligned ? c.alignedX * (calendarWidth / alignedWidth) : c.calendarX;
          const fill = c.status === STATUS_COVERED ? "#D9A441" : c.status === STATUS_CENSORED ? "#3A4854" : "#243039";
          return (
            <rect
              key={c.key}
              x={x}
              y={c.y * cell + 12}
              width={Math.max(1, calendarWidth / (aligned ? alignedWidth : calendarWidth))}
              height={cell - 0.5}
              fill={fill}
              style={{ transition: "x 900ms cubic-bezier(0.16, 1, 0.3, 1)" }}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-subtext">
        <span>{aligned ? `${LO} days` : dates[0]}</span>
        <span>{aligned ? "appointment day" : "each real appointment for this patient"}</span>
        <span>{aligned ? `+${HI} days` : dates[dates.length - 1]}</span>
      </div>
    </div>
  );
}
