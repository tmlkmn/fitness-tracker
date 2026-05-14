"use client";

import { useTranslations } from "next-intl";
import { Activity, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { useTodayReadinessScore } from "@/hooks/use-readiness";
import { useTodayDashboard } from "@/hooks/use-plans";
import { readinessBandColor } from "@/lib/readiness-policy";

export function ReadinessDashboardCard() {
  const t = useTranslations("readiness");
  const { data, isLoading } = useTodayReadinessScore();
  const { data: dashboard } = useTodayDashboard();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { score, band, hasSubjective } = data;
  const barColor = readinessBandColor(band);
  const linkParams = dashboard?.dailyPlan?.id
    ? String(dashboard.dailyPlan.id)
    : null;

  const inner = (
    <Card className="hover:bg-accent/20 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("dashboardCard.title")}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                hasSubjective
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {hasSubjective
                ? t("dashboardCard.fullBadge")
                : t("dashboardCard.passiveBadge")}
            </span>
            {linkParams && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="flex items-baseline justify-between">
          <p className="text-3xl font-bold tabular-nums">{score}</p>
          <p className="text-xs text-muted-foreground">
            {t(`bands.${band}`)}
          </p>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground leading-snug">
          {t(`recommendation.${band}`)}
        </p>
      </CardContent>
    </Card>
  );

  if (linkParams) {
    return (
      <Link
        href={{
          pathname: "/gun/[dayId]",
          params: { dayId: linkParams },
          query: { focus: "readiness" },
        }}
        className="block"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
