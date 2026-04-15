"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, X } from "lucide-react";
import { useAllWeeks } from "@/hooks/use-plans";
import { useMySharesForPlan, useRevokeShare } from "@/hooks/use-sharing";
import { ShareDialog } from "./share-dialog";

function PlanShareRow({ weeklyPlanId, title }: { weeklyPlanId: number; title: string }) {
  const { data: shares, isLoading } = useMySharesForPlan(weeklyPlanId);
  const revokeMutation = useRevokeShare();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
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
        ) : !weeks?.length ? (
          <p className="text-sm text-muted-foreground">
            Paylaşılacak plan yok
          </p>
        ) : (
          weeks.map((week) => (
            <PlanShareRow
              key={week.id}
              weeklyPlanId={week.id}
              title={`Hafta ${week.weekNumber}: ${week.title}`}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
