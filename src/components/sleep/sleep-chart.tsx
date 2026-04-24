"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Moon } from "lucide-react";
import { useSleepLogs } from "@/hooks/use-sleep";
import {
  ResponsiveContainer,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
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

const SLEEP_HOURS_GRADIENT = chartGradientId("sleep-hours");
const SLEEP_HOURS_COLOR = "hsl(240, 75%, 70%)";
const SLEEP_QUALITY_COLOR = "hsl(280, 70%, 70%)";

export function SleepChart() {
  const { data: logs } = useSleepLogs();

  if (!logs || logs.length < 2) return null;

  const chartData = [...logs]
    .reverse()
    .map((l) => ({
      date: new Date(l.logDate + "T00:00:00").toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      }),
      hours: l.durationMinutes ? +(l.durationMinutes / 60).toFixed(1) : null,
      quality: l.quality,
    }));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold">Uyku Takibi</h3>
          <span className="text-xs text-muted-foreground ml-auto">
            Son {chartData.length} gün
          </span>
        </div>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id={SLEEP_HOURS_GRADIENT} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SLEEP_HOURS_COLOR} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={SLEEP_HOURS_COLOR} stopOpacity={0} />
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
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                cursor={CHART_TOOLTIP_CURSOR}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  if (name === "hours") return [`${value} saat`, "Süre"];
                  if (name === "quality") return [`${value}/5`, "Kalite"];
                  return [value, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke={SLEEP_HOURS_COLOR}
                strokeWidth={2.25}
                fill={`url(#${SLEEP_HOURS_GRADIENT})`}
                dot={{ r: 3, stroke: "hsl(var(--background))", strokeWidth: 1.5 }}
                activeDot={{ r: 5, stroke: "hsl(var(--background))", strokeWidth: 2 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="quality"
                stroke={SLEEP_QUALITY_COLOR}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={{ r: 2 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ background: SLEEP_HOURS_COLOR }} />
            <span className="text-[10px] text-muted-foreground">
              Süre (saat)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-0.5 rounded opacity-70"
              style={{ background: SLEEP_QUALITY_COLOR }}
            />
            <span className="text-[10px] text-muted-foreground">
              Kalite (1-5)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
