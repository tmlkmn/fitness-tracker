"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, X } from "lucide-react";
import { useAllWeeks } from "@/hooks/use-plans";
import { useMySharesForPlan, useRevokeShare } from "@/hooks/use-sharing";
import { formatWeekRange, isWeekPast } from "@/lib/utils";
import { ShareDialog } from "./share-dialog";

function PlanShareRow({
  weeklyPlanId,
  title,
  dateRange,
}: {
  weeklyPlanId: number;
  title: string;
  dateRange: string | null;
}) {
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
        <Loader2 className="h-4 w-4 animate-spin" />
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
        <p className="text-xs text-muted-foreground">Henüz paylaşılmadı</p>
      )}
    </div>
  );
}

export function ShareManager() {
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
          Plan Paylaşımı
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        ) : !activeWeeks?.length ? (
          <p className="text-sm text-muted-foreground">
            Paylaşılacak aktif plan yok
          </p>
        ) : (
          activeWeeks.map((week) => (
            <PlanShareRow
              key={week.id}
              weeklyPlanId={week.id}
              title={`Hafta ${week.weekNumber}: ${week.title}`}
              dateRange={week.startDate ? formatWeekRange(week.startDate) : null}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
