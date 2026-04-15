"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

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

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={["dataMin - 1", "dataMax + 1"]}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          unit={unitSuffix}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          formatter={(value) => [`${value}${unitSuffix}`, label]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{
            r: 4,
            fill: "hsl(var(--primary))",
            stroke: "hsl(var(--background))",
            strokeWidth: 2,
          }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
