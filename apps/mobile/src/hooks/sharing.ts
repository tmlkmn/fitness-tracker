import type {
  DailyPlanDto,
  ExerciseDto,
  MealDto,
  PlanShareDto,
  ShareableUserDto,
  SharedDailyPlanDto,
  SharedWeeklyPlanDto,
  SharedWithMeDto,
} from "@fitmusc/shared/api/dto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

// Read-only plans others shared with the user (web: /paylasilan) and the
// user's own shares (web: ShareManager on settings, the calendar's share button).

export const sharingKeys = {
  withMe: ["sharing.withMe"] as const,
  week: (id: number) => ["sharing.week", id] as const,
  weekDays: (id: number) => ["sharing.weekDays", id] as const,
  day: (id: number) => ["sharing.day", id] as const,
  dayMeals: (id: number) => ["sharing.dayMeals", id] as const,
  dayExercises: (id: number) => ["sharing.dayExercises", id] as const,
  myShares: (weeklyPlanId: number) => ["sharing.myShares", weeklyPlanId] as const,
  users: ["sharing.users"] as const,
};

export function useSharedWithMe() {
  return useQuery({ queryKey: sharingKeys.withMe, queryFn: () => api<SharedWithMeDto[]>("/shared-with-me") });
}

export function useSharedWeek(id: number) {
  return useQuery({ queryKey: sharingKeys.week(id), queryFn: () => api<SharedWeeklyPlanDto>(`/shared/weeks/${id}`) });
}

export function useSharedWeekDays(id: number) {
  return useQuery({ queryKey: sharingKeys.weekDays(id), queryFn: () => api<DailyPlanDto[]>(`/shared/weeks/${id}/days`) });
}

export function useSharedDay(id: number) {
  return useQuery({ queryKey: sharingKeys.day(id), queryFn: () => api<SharedDailyPlanDto>(`/shared/days/${id}`) });
}

export function useSharedDayMeals(id: number) {
  return useQuery({ queryKey: sharingKeys.dayMeals(id), queryFn: () => api<MealDto[]>(`/shared/days/${id}/meals`) });
}

export function useSharedDayExercises(id: number) {
  return useQuery({ queryKey: sharingKeys.dayExercises(id), queryFn: () => api<ExerciseDto[]>(`/shared/days/${id}/exercises`) });
}

/** Who this week of the user's is shared with. */
export function useMyShares(weeklyPlanId: number) {
  return useQuery({
    queryKey: sharingKeys.myShares(weeklyPlanId),
    queryFn: () => api<PlanShareDto[]>(`/weeks/${weeklyPlanId}/shares`),
  });
}

/** Approved users the week can be shared with. */
export function useShareableUsers() {
  return useQuery({ queryKey: sharingKeys.users, queryFn: () => api<ShareableUserDto[]>("/shareable-users"), staleTime: 5 * 60_000 });
}

/** Shares the week read-only with a user (the server notifies them). */
export function useShareWeek(weeklyPlanId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sharedWithUserId: string) => api(`/weeks/${weeklyPlanId}/shares`, { method: "POST", body: { sharedWithUserId } }),
    onSettled: () => qc.invalidateQueries({ queryKey: sharingKeys.myShares(weeklyPlanId) }),
  });
}

export function useRevokeShare(weeklyPlanId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: number) => api(`/shares/${shareId}`, { method: "DELETE" }),
    onSettled: () => qc.invalidateQueries({ queryKey: sharingKeys.myShares(weeklyPlanId) }),
  });
}
