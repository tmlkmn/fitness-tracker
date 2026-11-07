import type { ActivityStatsDto, FriendStreakDto } from "@fitmusc/shared/api/dto";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const gamificationKeys = {
  activityStats: ["me.activityStats"] as const,
  friendStreaks: ["friends.streaks"] as const,
};

/** Streak, completed days and totals behind the streak card and the badges. */
export function useActivityStats() {
  return useQuery({
    queryKey: gamificationKeys.activityStats,
    queryFn: () => api<ActivityStatsDto>("/me/activity-stats"),
    staleTime: 5 * 60_000,
  });
}

/** The user and the people they share plans with, ranked by current streak. */
export function useFriendStreaks() {
  return useQuery({
    queryKey: gamificationKeys.friendStreaks,
    queryFn: () => api<FriendStreakDto[]>("/friends/streaks"),
    staleTime: 5 * 60_000,
  });
}
