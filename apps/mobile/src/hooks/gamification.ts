import type { ActivityStatsDto } from "@fitmusc/shared/api/dto";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const gamificationKeys = {
  activityStats: ["me.activityStats"] as const,
};

/** Streak, completed days and totals behind the streak card and the badges. */
export function useActivityStats() {
  return useQuery({
    queryKey: gamificationKeys.activityStats,
    queryFn: () => api<ActivityStatsDto>("/me/activity-stats"),
    staleTime: 5 * 60_000,
  });
}
