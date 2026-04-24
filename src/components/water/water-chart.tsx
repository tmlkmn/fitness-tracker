"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import { useWaterLogs } from "@/hooks/use-water";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_CURSOR_BAR,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  chartGradientId,
} from "@/lib/chart-theme";

const WATER_GRADIENT_ID = chartGradientId("water-bar");

export function WaterChart() {
  const { data: logs } = useWaterLogs();

  if (!logs || logs.length < 2) return null;

  const chartData = [...logs]
    .reverse()
    .map((l) => ({
      date: new Date(l.logDate + "T00:00:00").toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      }),
      glasses: l.glasses,
      target: l.targetGlasses,
    }));

  const avgTarget = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + l.targetGlasses, 0) / logs.length)
    : 8;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold">Su Takibi</h3>
          <span className="text-xs text-muted-foreground ml-auto">
            Son {chartData.length} gün
          </span>
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={WATER_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210, 90%, 65%)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="hsl(210, 90%, 55%)" stopOpacity={0.7} />
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
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                cursor={CHART_TOOLTIP_CURSOR_BAR}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value} bardak`, "Su"]}
              />
              <ReferenceLine
                y={avgTarget}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{
                  value: `Hedef ${avgTarget}`,
                  position: "right",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <Bar
                dataKey="glasses"
                fill={`url(#${WATER_GRADIENT_ID})`}
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
