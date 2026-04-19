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
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value} bardak`, "Su"]}
              />
              <ReferenceLine
                y={avgTarget}
                stroke="hsl(var(--primary))"
                strokeDasharray="3 3"
                label={{
                  value: `Hedef: ${avgTarget}`,
                  position: "right",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <Bar
                dataKey="glasses"
                fill="hsl(210, 80%, 60%)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
