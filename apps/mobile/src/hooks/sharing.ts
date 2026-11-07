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

/** People the user shared a plan with before — never the whole user list. */
export function useShareableUsers() {
  return useQuery({ queryKey: sharingKeys.users, queryFn: () => api<ShareableUserDto[]>("/shareable-users"), staleTime: 5 * 60_000 });
}

/**
 * Shares the week read-only (the server notifies the recipient): by the
 * e-mail the user typed, or by id for someone from useShareableUsers.
 */
export function useShareWeek(weeklyPlanId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (target: { email: string } | { sharedWithUserId: string }) =>
      api(`/weeks/${weeklyPlanId}/shares`, { method: "POST", body: target }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: sharingKeys.myShares(weeklyPlanId) });
      void qc.invalidateQueries({ queryKey: sharingKeys.users });
    },
  });
}

export function useRevokeShare(weeklyPlanId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: number) => api(`/shares/${shareId}`, { method: "DELETE" }),
    onSettled: () => qc.invalidateQueries({ queryKey: sharingKeys.myShares(weeklyPlanId) }),
  });
}
