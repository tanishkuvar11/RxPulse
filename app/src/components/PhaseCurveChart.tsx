import { useMemo, useState } from "react";
import { scaleLinear } from "@visx/scale";
import { LinePath, AreaClosed } from "@visx/shape";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";

export interface CurvePoint {
  offset: number;
  value: number | null;
}

/** The phase-aligned coverage curve with its permutation null band drawn behind it --
 * the null must be visible on the chart itself, not just quoted as a p-value. Near
 * (-14..-1) and far (-60..-31) bands are shaded so the lift computation is legible
 * directly off the plot. */
export function PhaseCurveChart({
  points,
  nullBand,
  nearBand,
  farBand,
  width = 720,
  height = 320,
}: {
  points: CurvePoint[];
  nullBand: [number, number];
  nearBand: [number, number];
  farBand: [number, number];
  width?: number;
  height?: number;
}) {
  const [hover, setHover] = useState<CurvePoint | null>(null);
  const margin = { top: 16, right: 16, bottom: 36, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const xScale = useMemo(
    () =>
      scaleLinear({
        domain: [points[0]?.offset ?? -60, points[points.length - 1]?.offset ?? 30],
        range: [0, innerW],
      }),
    [points, innerW]
  );
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  const yMin = Math.min(0, ...values);
  const yMax = Math.max(...values, 0.01);
  const pad = (yMax - yMin) * 0.15 || 0.02;
  const yScale = useMemo(
    () => scaleLinear({ domain: [yMin - pad, yMax + pad], range: [innerH, 0] }),
    [yMin, yMax, pad, innerH]
  );

  const defined = (p: CurvePoint) => p.value !== null;

  return (
    <div className="relative">
      <svg width={width} height={height} className="max-w-full">
        <Group left={margin.left} top={margin.top}>
          {/* near / far bands */}
          <rect
            x={xScale(nearBand[0])}
            width={xScale(nearBand[1]) - xScale(nearBand[0])}
            y={0}
            height={innerH}
            fill="#D9A441"
            opacity={0.08}
          />
          <rect
            x={xScale(farBand[0])}
            width={xScale(farBand[1]) - xScale(farBand[0])}
            y={0}
            height={innerH}
            fill="#8FA0AC"
            opacity={0.08}
          />
          {/* encounter line at offset 0 */}
          <line x1={xScale(0)} x2={xScale(0)} y1={0} y2={innerH} stroke="#8FA0AC" strokeDasharray="2,3" />

          {/* permutation null band, shown as a horizontal reference band around 0 */}
          <rect
            x={0}
            width={innerW}
            y={yScale(nullBand[1])}
            height={Math.max(0, yScale(nullBand[0]) - yScale(nullBand[1]))}
            fill="#8FA0AC"
            opacity={0.12}
          />
          <line x1={0} x2={innerW} y1={yScale(0)} y2={yScale(0)} stroke="#243039" strokeWidth={1} />

          <LinePath
            data={points}
            defined={defined}
            x={(p) => xScale(p.offset)}
            y={(p) => yScale(p.value as number)}
            stroke="#D9A441"
            strokeWidth={2}
            curve={undefined}
          />

          <AxisBottom
            top={innerH}
            scale={xScale}
            stroke="#243039"
            tickStroke="#243039"
            tickLabelProps={() => ({ fill: "#8FA0AC", fontSize: 10, fontFamily: "JetBrains Mono, monospace", textAnchor: "middle", dy: 4 })}
            label="days relative to appointment"
            labelProps={{ fill: "#8FA0AC", fontSize: 11, textAnchor: "middle" }}
          />
          <AxisLeft
            scale={yScale}
            stroke="#243039"
            tickStroke="#243039"
            tickFormat={(v) => `${((v as number) * 100).toFixed(0)}%`}
            tickLabelProps={() => ({ fill: "#8FA0AC", fontSize: 10, fontFamily: "JetBrains Mono, monospace", textAnchor: "end", dx: -4, dy: 3 })}
          />

          {/* hover layer */}
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={(e) => {
              const rect = (e.target as SVGRectElement).getBoundingClientRect();
              const x = e.clientX - rect.left;
              const offset = Math.round(xScale.invert(x));
              const p = points.find((pt) => pt.offset === offset);
              setHover(p ?? null);
            }}
            onMouseLeave={() => setHover(null)}
          />
          {hover && hover.value !== null && (
            <g>
              <line x1={xScale(hover.offset)} x2={xScale(hover.offset)} y1={0} y2={innerH} stroke="#E8EDF0" strokeWidth={1} opacity={0.4} />
              <circle cx={xScale(hover.offset)} cy={yScale(hover.value)} r={3.5} fill="#D9A441" />
            </g>
          )}
        </Group>
      </svg>
      {hover && hover.value !== null && (
        <div className="tabular pointer-events-none absolute rounded-md border border-hairline bg-surface px-2 py-1 text-xs" style={{ left: margin.left + xScale(hover.offset) + 8, top: 8 }}>
          day {hover.offset >= 0 ? "+" : ""}
          {hover.offset}: {(hover.value * 100).toFixed(1)}% covered
        </div>
      )}
    </div>
  );
}
