import { useMemo } from "react";
import { scaleLinear } from "@visx/scale";
import { LinePath } from "@visx/shape";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";

/** Predicted vs realized coverage for the conformal intervals -- the single most
 * credibility-generating visual in the project. A perfectly calibrated procedure sits
 * on the diagonal; the amber line is what this pipeline actually achieved. */
export function CalibrationChart({
  nominal,
  realized,
  width = 420,
  height = 320,
}: {
  nominal: number[];
  realized: number[];
  width?: number;
  height?: number;
}) {
  const margin = { top: 12, right: 16, bottom: 40, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const scale = useMemo(() => scaleLinear({ domain: [0.4, 1], range: [0, innerW] }), [innerW]);
  const yScale = useMemo(() => scaleLinear({ domain: [0.4, 1], range: [innerH, 0] }), [innerH]);

  const points = nominal.map((n, i) => ({ x: n, y: realized[i] }));
  const diag = [{ x: 0.4, y: 0.4 }, { x: 1, y: 1 }];

  return (
    <svg width={width} height={height} className="max-w-full">
      <Group left={margin.left} top={margin.top}>
        <LinePath data={diag} x={(d) => scale(d.x)} y={(d) => yScale(d.y)} stroke="#243039" strokeWidth={1.5} strokeDasharray="3,3" />
        <LinePath data={points} x={(d) => scale(d.x)} y={(d) => yScale(d.y)} stroke="#D9A441" strokeWidth={2.5} />
        {points.map((p, i) => (
          <circle key={i} cx={scale(p.x)} cy={yScale(p.y)} r={3} fill="#D9A441" />
        ))}
        <AxisBottom
          top={innerH}
          scale={scale}
          stroke="#243039"
          tickStroke="#243039"
          tickFormat={(v) => `${((v as number) * 100).toFixed(0)}%`}
          tickLabelProps={() => ({ fill: "#8FA0AC", fontSize: 10, fontFamily: "JetBrains Mono, monospace", textAnchor: "middle", dy: 4 })}
          label="nominal coverage"
          labelProps={{ fill: "#8FA0AC", fontSize: 11, textAnchor: "middle" }}
        />
        <AxisLeft
          scale={yScale}
          stroke="#243039"
          tickStroke="#243039"
          tickFormat={(v) => `${((v as number) * 100).toFixed(0)}%`}
          tickLabelProps={() => ({ fill: "#8FA0AC", fontSize: 10, fontFamily: "JetBrains Mono, monospace", textAnchor: "end", dx: -4, dy: 3 })}
          label="realized coverage"
          labelProps={{ fill: "#8FA0AC", fontSize: 11, textAnchor: "middle" }}
        />
      </Group>
    </svg>
  );
}
