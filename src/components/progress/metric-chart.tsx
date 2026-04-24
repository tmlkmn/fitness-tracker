"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_CURSOR,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  chartGradientId,
} from "@/lib/chart-theme";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogEntry = Record<string, any>;

interface MetricChartProps {
  data: LogEntry[];
  metric: string;
  label: string;
  unit: string;
}

export function MetricChart({ data, metric, label, unit }: MetricChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Henüz veri yok. İlk ölçümünüzü ekleyin!
      </div>
    );
  }

  const chartData = data
    .filter((d) => d[metric])
    .map((d) => ({
      date: d.logDate as string,
      value: parseFloat(d[metric] as string),
    }))
    .reverse();

  if (chartData.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Henüz {label.toLowerCase()} verisi yok.
      </div>
    );
  }

  if (chartData.length === 1) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Son ölçüm: {chartData[0].value} {unit} — Grafik için en az 2 kayıt
        gerekli
      </div>
    );
  }

  const unitSuffix = unit ? ` ${unit}` : "";
  const gradId = chartGradientId(`metric-${metric}`);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke={CHART_GRID_STROKE}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={CHART_AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={["dataMin - 1", "dataMax + 1"]}
          tick={CHART_AXIS_TICK}
          tickLine={false}
          axisLine={false}
          unit={unitSuffix}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
          cursor={CHART_TOOLTIP_CURSOR}
          formatter={(value) => [`${value}${unitSuffix}`, label]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2.25}
          fill={`url(#${gradId})`}
          dot={{
            r: 3,
            fill: "hsl(var(--primary))",
            stroke: "hsl(var(--background))",
            strokeWidth: 1.5,
          }}
          activeDot={{
            r: 6,
            stroke: "hsl(var(--background))",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
