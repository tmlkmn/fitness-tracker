"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Scale } from "lucide-react";
import type { Locale } from "@/lib/locale";
import { formatDate, parseDateOnly } from "@/lib/date-format";
import {
  CHART_TOOLTIP_CURSOR,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  chartGradientId,
} from "@/lib/chart-theme";
import type { WeightTrend } from "@/actions/admin-user-detail";

function fmtKg(v: number): string {
  return v.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

function fmtSignedKg(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${fmtKg(v)}`;
}

export function WeightTrendCard({ trend }: { trend: WeightTrend }) {
  const t = useTranslations("admin.userDetail");
  const locale = useLocale() as Locale;

  const { points, deltaKg, slopePerWeek, latestWeight, targetWeight } = trend;
  const hasData = points.length > 0;
  const toTarget =
    latestWeight != null && targetWeight != null
      ? targetWeight - latestWeight
      : null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            {t("weightTrend")}
          </h3>
          {latestWeight != null && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("weightLatest", { weight: fmtKg(latestWeight) })}
            </p>
          )}
        </div>

        {!hasData ? (
          <p className="text-sm text-muted-foreground">{t("weightEmpty")}</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart
                data={points}
                margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient
                    id={chartGradientId("admin-weight")}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(var(--primary))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="logDate" hide />
                <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  cursor={CHART_TOOLTIP_CURSOR}
                  labelFormatter={(l) => {
                    if (typeof l !== "string" || !l.includes("-")) return "";
                    return formatDate(parseDateOnly(l), locale, {
                      day: "numeric",
                      month: "short",
                    });
                  }}
                  formatter={(value) => [`${value} kg`, ""]}
                />
                {targetWeight != null && (
                  <ReferenceLine
                    y={targetWeight}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill={`url(#${chartGradientId("admin-weight")})`}
                  dot={{ r: 2, fill: "hsl(var(--primary))" }}
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
              {deltaKg != null && (
                <span>
                  Δ {t("weightDelta", { delta: fmtSignedKg(deltaKg) })}
                </span>
              )}
              {slopePerWeek != null && (
                <span>
                  {t("weightSlopePerWeek", {
                    slope: fmtSignedKg(slopePerWeek),
                  })}
                </span>
              )}
              {targetWeight != null && (
                <span>{t("weightTarget", { weight: fmtKg(targetWeight) })}</span>
              )}
              {toTarget != null && (
                <span>
                  {t("weightToTarget", { delta: fmtSignedKg(toTarget) })}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
