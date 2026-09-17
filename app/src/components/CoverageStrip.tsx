import { STATUS_CENSORED, STATUS_COVERED } from "../lib/types";

/** A dosing calendar rendered as a coverage strip: one thin bar per day, colored by
 * status. Amber = covered (the only signal color in this app). A quiet neutral =
 * uncovered. A hatch pattern = censored (inpatient stay) -- explicitly not a color
 * that could read as a finding. Optional encounter ticks mark visit dates above the
 * strip. */
export function CoverageStrip({
  dates,
  status,
  encounterDates = [],
  height = 28,
  patternId,
}: {
  dates: string[];
  status: number[];
  encounterDates?: string[];
  height?: number;
  patternId: string;
}) {
  const n = dates.length;
  if (n === 0) return null;
  const encounterSet = new Set(encounterDates);
  const w = 100 / n;

  return (
    <div className="relative w-full" style={{ height: height + 10 }}>
      <svg width="100%" height={height} viewBox={`0 0 100 10`} preserveAspectRatio="none" className="block">
        <defs>
          <pattern id={patternId} width="3" height="3" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="3" height="3" fill="#3A4854" />
            <line x1="0" y1="0" x2="0" y2="3" stroke="#0E1419" strokeWidth="1" />
          </pattern>
        </defs>
        {status.map((s, i) => {
          const fill = s === STATUS_COVERED ? "#D9A441" : s === STATUS_CENSORED ? `url(#${patternId})` : "#243039";
          return <rect key={i} x={i * w} y={0} width={w + 0.05} height={10} fill={fill} />;
        })}
      </svg>
      <div className="relative mt-1 h-2 w-full">
        {dates.map((d, i) =>
          encounterSet.has(d) ? (
            <div
              key={d}
              className="absolute top-0 h-2 w-px bg-subtext"
              style={{ left: `${(i / n) * 100}%` }}
              title={`encounter ${d}`}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
