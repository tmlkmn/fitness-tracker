"use client";

import { useMySharesForPlan } from "@/hooks/use-sharing";
import { ShareDialog } from "./share-dialog";

interface ShareWeeklyPlanButtonProps {
  weeklyPlanId: number;
}

/**
 * Calendar action-bar entry point for sharing the current weekly plan.
 * Wraps the share dialog with the data plumbing (existing shares) so the
 * calling site only needs the plan id.
 */
export function ShareWeeklyPlanButton({ weeklyPlanId }: ShareWeeklyPlanButtonProps) {
  const { data: shares } = useMySharesForPlan(weeklyPlanId);
  const existingIds = shares?.map((s) => s.sharedWithUserId) ?? [];
  return (
    <ShareDialog
      weeklyPlanId={weeklyPlanId}
      existingShareUserIds={existingIds}
      trigger="icon"
      existingShareCount={shares?.length ?? 0}
    />
  );
}
