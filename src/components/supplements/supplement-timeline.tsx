"use client";

import { useSupplementsByWeek } from "@/hooks/use-plans";
import { SupplementCard } from "./supplement-card";
import { Skeleton } from "@/components/ui/skeleton";

interface SupplementTimelineProps {
  weeklyPlanId: number;
}

export function SupplementTimeline({ weeklyPlanId }: SupplementTimelineProps) {
  const { data: supplements, isLoading } = useSupplementsByWeek(weeklyPlanId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!supplements?.length) {
    return (
      <p className="text-center text-muted-foreground py-4 text-sm">
        Bu hafta supplement yok
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {supplements.map((s) => (
        <SupplementCard key={s.id} {...s} />
      ))}
    </div>
  );
}
