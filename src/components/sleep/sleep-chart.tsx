"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Moon } from "lucide-react";
import { useSleepLogs } from "@/hooks/use-sleep";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

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
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <YAxis
                tick={{
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
                domain={[0, "auto"]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: 12,
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  if (name === "hours") return [`${value} saat`, "Süre"];
                  if (name === "quality") return [`${value}/5`, "Kalite"];
                  return [value, name];
                }}
              />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="hsl(240, 60%, 65%)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="quality"
                stroke="hsl(280, 60%, 65%)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={{ r: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-[hsl(240,60%,65%)]" />
            <span className="text-[10px] text-muted-foreground">
              Süre (saat)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-[hsl(280,60%,65%)] opacity-70" />
            <span className="text-[10px] text-muted-foreground">
              Kalite (1-5)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
