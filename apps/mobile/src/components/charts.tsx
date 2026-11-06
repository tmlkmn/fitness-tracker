import { useState } from "react";
import { StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { colors, radius, spacing } from "@/lib/theme";

// Single-series charts drawn with react-native-svg. One series per chart, so no
// legend box: the card title names it. Specs: 2px line with a ~10% area wash,
// end dot r4 with a 2px surface ring, bars ≤24px with a 4px rounded top and a
// square baseline, hairline solid grid, text in text colours. Tap or drag to
// read a value (the touch version of a hover tooltip).

export interface ChartPoint {
  key: string;
  /** Position on the x axis (line: days since epoch, so gaps between logs stay honest). */
  x: number;
  /** Shown under the axis and in the tooltip. */
  label: string;
  value: number;
}

/** The surface the charts sit on — rings and gaps are drawn in it. */
const SURFACE = colors.card;
const PLOT = { left: 36, right: 12, top: 26, bottom: 22 };

function niceTicks(min: number, max: number, count = 4): number[] {
  let lo = min;
  let hi = max;
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.05 || 1;
    lo -= pad;
    hi += pad;
  }
  const rough = (hi - lo) / (count - 1);
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const ticks: number[] = [];
  for (let v = Math.floor(lo / step) * step; v <= Math.ceil(hi / step) * step + step / 2; v += step) {
    ticks.push(Number(v.toFixed(6)));
  }
  return ticks;
}

const withUnit = (value: string, unit?: string) => (unit ? `${value} ${unit}` : value);

function useWidth() {
  const [width, setWidth] = useState(0);
  return [width, (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)] as const;
}

/** Transparent layer that turns a touch's x into the nearest point index. */
function TouchLayer({ onPick, positions }: { onPick: (index: number | null) => void; positions: number[] }) {
  const pick = (e: GestureResponderEvent) => {
    const x = e.nativeEvent.locationX;
    let best = 0;
    for (let i = 1; i < positions.length; i++) {
      if (Math.abs(positions[i] - x) < Math.abs(positions[best] - x)) best = i;
    }
    onPick(best);
  };
  return (
    <View
      style={StyleSheet.absoluteFill}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={pick}
      onResponderMove={pick}
      // Let a vertical scroll take over.
      onResponderTerminationRequest={() => true}
    />
  );
}

function Tooltip({ x, width, title, value }: { x: number; width: number; title: string; value: string }) {
  const w = 120;
  const left = Math.min(Math.max(x - w / 2, 0), Math.max(width - w, 0));
  return (
    <View pointerEvents="none" style={[styles.tooltip, { left, width: w }]}>
      <Text style={styles.tooltipTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.tooltipValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function YAxis({ ticks, y, format }: { ticks: number[]; y: (v: number) => number; format: (v: number) => string }) {
  return (
    <>
      {ticks.map((t) => (
        <Text key={t} style={[styles.axisLabel, styles.yLabel, { top: y(t) - 7 }]} numberOfLines={1}>
          {format(t)}
        </Text>
      ))}
    </>
  );
}

function XLabels({ first, last }: { first: string; last: string }) {
  return (
    <>
      <Text style={[styles.axisLabel, styles.xLabel, { left: PLOT.left }]}>{first}</Text>
      <Text style={[styles.axisLabel, styles.xLabel, { right: PLOT.right }]}>{last}</Text>
    </>
  );
}

export function LineChart({
  points,
  color,
  format,
  unit,
  height = 180,
  accessibilityLabel,
}: {
  points: ChartPoint[];
  color: string;
  /** Number only (axis ticks); the tooltip and end label add `unit`. */
  format: (value: number) => string;
  unit?: string;
  height?: number;
  accessibilityLabel: string;
}) {
  const [width, onLayout] = useWidth();
  const [selected, setSelected] = useState<number | null>(null);
  const ready = width > 0 && points.length >= 2;

  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const xMin = points[0]?.x ?? 0;
  const xMax = points[points.length - 1]?.x ?? 1;
  const innerW = width - PLOT.left - PLOT.right;
  const innerH = height - PLOT.top - PLOT.bottom;
  const sx = (x: number) => PLOT.left + (xMax === xMin ? innerW / 2 : ((x - xMin) / (xMax - xMin)) * innerW);
  const sy = (v: number) => PLOT.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const baseline = PLOT.top + innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${sx(p.x)},${sy(p.value)}`).join(" ");
  const area = `${line} L${sx(xMax)},${baseline} L${sx(xMin)},${baseline} Z`;
  const last = points[points.length - 1];
  const active = selected != null ? points[selected] : null;

  return (
    <View
      style={{ height }}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {ready ? (
        <>
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <Line key={t} x1={PLOT.left} x2={width - PLOT.right} y1={sy(t)} y2={sy(t)} stroke={colors.border} strokeWidth={1} />
            ))}
            <Path d={area} fill={color} fillOpacity={0.1} />
            <Path d={line} stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill="none" />
            {active ? (
              <>
                <Line x1={sx(active.x)} x2={sx(active.x)} y1={PLOT.top} y2={baseline} stroke={colors.textMuted} strokeWidth={1} />
                <Circle cx={sx(active.x)} cy={sy(active.value)} r={5} fill={color} stroke={SURFACE} strokeWidth={2} />
              </>
            ) : (
              <Circle cx={sx(last.x)} cy={sy(last.value)} r={4} fill={color} stroke={SURFACE} strokeWidth={2} />
            )}
          </Svg>
          <YAxis ticks={ticks} y={sy} format={format} />
          <XLabels first={points[0].label} last={last.label} />
          {active ? (
            <Tooltip x={sx(active.x)} width={width} title={active.label} value={withUnit(format(active.value), unit)} />
          ) : (
            // Direct label on the latest value only.
            <Text
              pointerEvents="none"
              style={[styles.endLabel, { top: sy(last.value) - 22, right: width - sx(last.x) - 4 }]}
              numberOfLines={1}
            >
              {withUnit(format(last.value), unit)}
            </Text>
          )}
          <TouchLayer positions={points.map((p) => sx(p.x))} onPick={setSelected} />
        </>
      ) : null}
    </View>
  );
}

function barPath(x: number, top: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  const bottom = top + h;
  return `M${x},${bottom} L${x},${top + r} A${r},${r} 0 0 1 ${x + r},${top} L${x + w - r},${top} A${r},${r} 0 0 1 ${x + w},${top + r} L${x + w},${bottom} Z`;
}

export function BarChart({
  bars,
  color,
  format,
  unit,
  reference,
  height = 160,
  accessibilityLabel,
}: {
  bars: ChartPoint[];
  color: string;
  format: (value: number) => string;
  unit?: string;
  /** Horizontal target line, e.g. the water goal. */
  reference?: { value: number; label: string };
  height?: number;
  accessibilityLabel: string;
}) {
  const [width, onLayout] = useWidth();
  const [selected, setSelected] = useState<number | null>(null);
  const ready = width > 0 && bars.length > 0;

  const max = Math.max(...bars.map((b) => b.value), reference?.value ?? 0, 1);
  const ticks = niceTicks(0, max, 3);
  const yMax = ticks[ticks.length - 1];
  const innerW = width - PLOT.left - PLOT.right;
  const innerH = height - PLOT.top - PLOT.bottom;
  const slot = innerW / Math.max(bars.length, 1);
  // ≤24px, and always at least a 2px surface gap between neighbours.
  const barW = Math.max(Math.min(24, slot - 2), 2);
  const cx = (i: number) => PLOT.left + slot * (i + 0.5);
  const sy = (v: number) => PLOT.top + (1 - v / yMax) * innerH;
  const active = selected != null ? bars[selected] : null;

  return (
    <View
      style={{ height }}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {ready ? (
        <>
          <Svg width={width} height={height}>
            {ticks.map((t) => (
              <Line key={t} x1={PLOT.left} x2={width - PLOT.right} y1={sy(t)} y2={sy(t)} stroke={colors.border} strokeWidth={1} />
            ))}
            {bars.map((bar, i) => (
              <Path
                key={bar.key}
                d={barPath(cx(i) - barW / 2, sy(bar.value), barW, sy(0) - sy(bar.value))}
                fill={color}
                fillOpacity={selected == null || selected === i ? 1 : 0.4}
              />
            ))}
            {reference ? (
              <Line
                x1={PLOT.left}
                x2={width - PLOT.right}
                y1={sy(reference.value)}
                y2={sy(reference.value)}
                stroke={colors.text}
                strokeOpacity={0.6}
                strokeWidth={1}
              />
            ) : null}
          </Svg>
          <YAxis ticks={ticks} y={sy} format={format} />
          <XLabels first={bars[0].label} last={bars[bars.length - 1].label} />
          {reference && !active ? (
            <Text pointerEvents="none" style={[styles.referenceLabel, { top: sy(reference.value) - 18 }]} numberOfLines={1}>
              {reference.label}
            </Text>
          ) : null}
          {active && selected != null ? (
            <Tooltip x={cx(selected)} width={width} title={active.label} value={withUnit(format(active.value), unit)} />
          ) : null}
          <TouchLayer positions={bars.map((_, i) => cx(i))} onPick={setSelected} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  axisLabel: { position: "absolute", fontSize: 11, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  yLabel: { left: 0, width: PLOT.left - 6, textAlign: "right" },
  xLabel: { bottom: 0 },
  endLabel: { position: "absolute", fontSize: 12, fontWeight: "600", color: colors.text },
  referenceLabel: { position: "absolute", right: PLOT.right, fontSize: 11, color: colors.textMuted },
  tooltip: {
    position: "absolute",
    top: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.cardPressed,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tooltipTitle: { fontSize: 11, color: colors.textMuted },
  tooltipValue: { fontSize: 13, fontWeight: "600", color: colors.text },
});
