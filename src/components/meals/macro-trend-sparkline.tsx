"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { getWeeklyMacroTotals, type DailyMacroPoint } from "@/actions/meals";
import { useUserProfile } from "@/hooks/use-user";
import { resolveTargets } from "@/lib/macro-targets";
import { useMemo } from "react";

type Metric = "calories" | "protein" | "carbs" | "fat";

interface MacroTrendSparklineProps {
  endDate: string;
  metric?: Metric;
  title?: string;
}

const METRIC_LABELS: Record<Metric, { label: string; unit: string }> = {
  calories: { label: "Kalori", unit: "kcal" },
  protein: { label: "Protein", unit: "g" },
  carbs: { label: "Karb", unit: "g" },
  fat: { label: "Yağ", unit: "g" },
};

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" });
}

export function MacroTrendSparkline({
  endDate,
  metric = "calories",
  title,
}: MacroTrendSparklineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-macro-totals", endDate],
    queryFn: () => getWeeklyMacroTotals(endDate),
  });
  const { data: profile } = useUserProfile();
  const targets = useMemo(
    () => (profile ? resolveTargets(profile) : null),
    [profile],
  );

  const { label, unit } = METRIC_LABELS[metric];
  const chartData = (data ?? []).map((p: DailyMacroPoint) => ({
    date: p.date,
    value: p[metric],
  }));
  const target = targets ? targets[metric] : null;
  const todayValue = chartData.length ? chartData[chartData.length - 1].value : 0;
  const avg =
    chartData.length > 0
      ? Math.round(
          chartData.reduce((sum, x) => sum + x.value, 0) / chartData.length,
        )
      : 0;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {title ?? `7 Günlük ${label}`}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            Ort. {avg}
            {unit}
            {target ? ` / ${target}${unit}` : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {isLoading ? (
          <div className="h-[60px] bg-muted/50 rounded animate-pulse" />
        ) : (
          <div className="space-y-1">
            <ResponsiveContainer width="100%" height={60}>
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
              >
                <YAxis hide domain={[0, "dataMax + 10"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 11,
                    padding: "4px 8px",
                  }}
                  labelFormatter={(l) => formatShortDate(l as string)}
                  formatter={(value) => [`${value}${unit}`, label]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {chartData.length > 0 ? formatShortDate(chartData[0].date) : ""}
              </span>
              <span>
                Bugün: <span className="text-foreground font-medium">{todayValue}{unit}</span>
              </span>
              <span>
                {chartData.length > 0
                  ? formatShortDate(chartData[chartData.length - 1].date)
                  : ""}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
