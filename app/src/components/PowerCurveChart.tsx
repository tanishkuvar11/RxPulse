import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import type { PowerCurveRow } from "../lib/types";

/** Statistical power vs injected effect size, one line per noise level. Both lines are
 * the same amber signal color -- per the palette rule, a second series is distinguished
 * by line weight/dash, never a second hue. */
export function PowerCurveChart({ rows, width = 560, height = 320 }: { rows: PowerCurveRow[]; width?: number; height?: number }) {
  const margin = { top: 16, right: 16, bottom: 40, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const noiseLevels = useMemo(() => Array.from(new Set(rows.map((r) => r.noise_sd))).sort(), [rows]);
  const maxEffect = useMemo(() => Math.max(0.01, ...rows.map((r) => r.true_effect_size)), [rows]);
  const xScale = useMemo(() => scaleLinear({ domain: [0, maxEffect], range: [0, innerW] }), [innerW, maxEffect]);
  const yScale = useMemo(() => scaleLinear({ domain: [0, 1], range: [innerH, 0] }), [innerH]);

  return (
    <svg width={width} height={height} className="max-w-full">
      <Group left={margin.left} top={margin.top}>
        <line x1={0} x2={innerW} y1={yScale(0.8)} y2={yScale(0.8)} stroke="#8FA0AC" strokeDasharray="2,3" />
        <text x={innerW} y={yScale(0.8) - 4} fill="#8FA0AC" fontSize={10} textAnchor="end" fontFamily="JetBrains Mono, monospace">
          80% power
        </text>
        {noiseLevels.map((noise, i) => {
          const series = rows.filter((r) => r.noise_sd === noise).sort((a, b) => a.true_effect_size - b.true_effect_size);
          return (
            <LinePath
              key={noise}
              data={series}
              x={(d) => xScale(d.true_effect_size)}
              y={(d) => yScale(d.power)}
              stroke="#D9A441"
              strokeWidth={i === 0 ? 2.5 : 1.5}
              strokeDasharray={i === 0 ? undefined : "5,3"}
            />
          );
        })}
        <AxisBottom
          top={innerH}
          scale={xScale}
          numTicks={6}
          stroke="#243039"
          tickStroke="#243039"
          tickFormat={(v) => `${((v as number) * 100).toFixed(1)}pp`}
          tickLabelProps={() => ({ fill: "#8FA0AC", fontSize: 10, fontFamily: "JetBrains Mono, monospace", textAnchor: "middle", dy: 4 })}
          label="injected true effect size (percentage points of coverage)"
          labelProps={{ fill: "#8FA0AC", fontSize: 11, textAnchor: "middle" }}
        />
        <AxisLeft
          scale={yScale}
          stroke="#243039"
          tickStroke="#243039"
          tickFormat={(v) => `${((v as number) * 100).toFixed(0)}%`}
          tickLabelProps={() => ({ fill: "#8FA0AC", fontSize: 10, fontFamily: "JetBrains Mono, monospace", textAnchor: "end", dx: -4, dy: 3 })}
          label="power"
          labelProps={{ fill: "#8FA0AC", fontSize: 11, textAnchor: "middle" }}
        />
      </Group>
    </svg>
  );
}
