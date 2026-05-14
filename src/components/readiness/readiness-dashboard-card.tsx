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
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-sm font-semibold">
                {t("dashboardCard.title")}
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("dashboardCard.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              title={
                hasSubjective
                  ? t("dashboardCard.fullBadgeHint")
                  : t("dashboardCard.passiveBadgeHint")
              }
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

        <div className="flex items-baseline justify-between gap-2">
          <p className="text-3xl font-bold tabular-nums leading-none">
            {score}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              / 100
            </span>
          </p>
          <p className="text-xs font-medium">
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

        {!hasSubjective && linkParams && (
          <p className="text-[11px] text-primary font-medium pt-0.5 border-t border-border/40">
            {t("dashboardCard.tapToLog")}
          </p>
        )}
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
