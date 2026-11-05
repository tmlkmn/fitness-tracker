"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2, X } from "lucide-react";
import { useAllWeeks } from "@/hooks/use-plans";
import { useMySharesForPlan, useRevokeShare } from "@/hooks/use-sharing";
import { formatWeekRange, isWeekPast } from "@/lib/utils";
import { ShareDialog } from "./share-dialog";
import { useTranslations } from "next-intl";

function PlanShareRow({
  weeklyPlanId,
  title,
  dateRange,
}: {
  weeklyPlanId: number;
  title: string;
  dateRange: string | null;
}) {
  const t = useTranslations("shareManager");
  const { data: shares, isLoading } = useMySharesForPlan(weeklyPlanId);
  const revokeMutation = useRevokeShare();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          {dateRange && (
            <p className="text-xs text-muted-foreground">{dateRange}</p>
          )}
        </div>
        <ShareDialog
          weeklyPlanId={weeklyPlanId}
          existingShareUserIds={shares?.map((s) => s.sharedWithUserId) ?? []}
        />
      </div>
      {isLoading ? (
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      ) : shares && shares.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {shares.map((share) => (
            <Badge
              key={share.id}
              variant="secondary"
              className="gap-1 text-xs"
            >
              {share.sharedWithName}
              <button
                onClick={() => revokeMutation.mutate(share.id)}
                disabled={revokeMutation.isPending}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("notShared")}</p>
      )}
    </div>
  );
}

export function ShareManager() {
  const t = useTranslations("shareManager");
  const { data: weeks, isLoading } = useAllWeeks();

  // Only weeks that are still active (Sunday end >= today) can be shared.
  const activeWeeks = weeks?.filter(
    (w) => !w.startDate || !isWeekPast(w.startDate),
  );

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-md shrink-0" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : !activeWeeks?.length ? (
          <p className="text-sm text-muted-foreground">
            {t("noActivePlans")}
          </p>
        ) : (
          activeWeeks.map((week) => (
            <PlanShareRow
              key={week.id}
              weeklyPlanId={week.id}
              title={t("weekTitle", { week: week.weekNumber, title: week.title })}
              dateRange={week.startDate ? formatWeekRange(week.startDate) : null}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
