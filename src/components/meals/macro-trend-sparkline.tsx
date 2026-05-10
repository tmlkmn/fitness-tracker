"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { getWeeklyMacroTotals, type DailyMacroPoint } from "@/actions/meals";
import { useResolvedMacroTargets } from "@/hooks/use-user";
import {
  CHART_TOOLTIP_CURSOR,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  chartGradientId,
} from "@/lib/chart-theme";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/lib/locale";

type Metric = "calories" | "protein" | "carbs" | "fat";

interface MacroTrendSparklineProps {
  endDate: string;
  metric?: Metric;
  title?: string;
}

const METRIC_UNITS: Record<Metric, string> = {
  calories: "kcal",
  protein: "g",
  carbs: "g",
  fat: "g",
};

function formatShortDate(iso: string, locale: Locale): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(locale === "en" ? "en-US" : "tr-TR", {
    weekday: "short",
    day: "numeric",
  });
}

export function MacroTrendSparkline({
  endDate,
  metric = "calories",
  title,
}: MacroTrendSparklineProps) {
  const t = useTranslations("meals.macroTrend");
  const locale = useLocale() as Locale;
  const { data, isLoading } = useQuery({
    queryKey: ["weekly-macro-totals", endDate],
    queryFn: () => getWeeklyMacroTotals(endDate),
  });
  const { data: targets } = useResolvedMacroTargets();

  const label = t(metric);
  const unit = METRIC_UNITS[metric];
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
            {title ?? t("titleDefault", { label })}
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {target
              ? t("averageWithTarget", { value: avg, unit, target })
              : t("average", { value: avg, unit })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {isLoading ? (
          <div className="h-[60px] bg-muted/50 rounded animate-pulse" />
        ) : (
          <div className="space-y-1">
            <ResponsiveContainer width="100%" height={60}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id={chartGradientId(`spark-${metric}`)} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, "dataMax + 10"]} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  cursor={CHART_TOOLTIP_CURSOR}
                  labelFormatter={(l) => {
                    if (typeof l !== "string" || !l.includes("-")) return "";
                    return formatShortDate(l, locale);
                  }}
                  formatter={(value) => [`${value}${unit}`, label]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill={`url(#${chartGradientId(`spark-${metric}`)})`}
                  dot={false}
                  activeDot={{ r: 4, stroke: "hsl(var(--background))", strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {chartData.length > 0 ? formatShortDate(chartData[0].date, locale) : ""}
              </span>
              <span>
                {t("today")}: <span className="text-foreground font-medium">{todayValue}{unit}</span>
              </span>
              <span>
                {chartData.length > 0
                  ? formatShortDate(chartData[chartData.length - 1].date, locale)
                  : ""}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
