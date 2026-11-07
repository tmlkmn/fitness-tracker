import type {
  DailyMacroPointDto,
  DailyPlanDto,
  DailySupplementDto,
  ExerciseDto,
  MacroTargetsForDayDto,
  MealDto,
  TodayDashboardDto,
} from "@fitmusc/shared/api/dto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { syncCompletion, withPending } from "@/lib/outbox";

import { patchCaches, restore } from "./cache";
import { gamificationKeys } from "./gamification";

export const keys = {
  today: ["dashboard.today"] as const,
  day: (dayId: number) => ["day", dayId] as const,
  meals: (dayId: number) => ["day.meals", dayId] as const,
  exercises: (dayId: number) => ["day.exercises", dayId] as const,
  supplements: (dayId: number) => ["day.supplements", dayId] as const,
  macroTargets: (planType: string | null) => ["macros.forDay", planType] as const,
  weeklyTotals: (endDate: string) => ["nutrition.weeklyTotals", endDate] as const,
};

// Lists with completion flags lay the offline outbox's unsent ticks over the
// server's answer (src/lib/outbox.ts), so a refetch never undoes one.

export function useTodayDashboard() {
  return useQuery({
    queryKey: keys.today,
    queryFn: async () => {
      const data = await api<TodayDashboardDto>("/dashboard/today");
      const dayId = data.dailyPlan?.id ?? 0;
      return {
        ...data,
        meals: await withPending("meal", data.meals, dayId),
        exercises: await withPending("exercise", data.exercises, dayId),
      };
    },
  });
}

export function useDay(dayId: number) {
  return useQuery({ queryKey: keys.day(dayId), queryFn: () => api<DailyPlanDto>(`/days/${dayId}`) });
}

export function useDayMeals(dayId: number) {
  return useQuery({
    queryKey: keys.meals(dayId),
    queryFn: async () => withPending("meal", await api<MealDto[]>(`/days/${dayId}/meals`), dayId),
  });
}

export function useDayExercises(dayId: number) {
  return useQuery({
    queryKey: keys.exercises(dayId),
    queryFn: async () => withPending("exercise", await api<ExerciseDto[]>(`/days/${dayId}/exercises`), dayId),
  });
}

export function useDaySupplements(dayId: number | undefined) {
  return useQuery({
    queryKey: keys.supplements(dayId ?? 0),
    queryFn: async () => withPending("supplement", await api<DailySupplementDto[]>(`/days/${dayId}/supplements`), dayId ?? 0),
    enabled: dayId != null,
  });
}

export function useMacroTargets(planType: string | null | undefined) {
  const type = planType ?? null;
  return useQuery({
    queryKey: keys.macroTargets(type),
    queryFn: () => api<MacroTargetsForDayDto>(`/me/macro-targets/for-day${type ? `?planType=${type}` : ""}`),
    staleTime: 5 * 60_000,
  });
}

/** Eaten macros per day for the 7 days ending at `endDate`. */
export function useWeeklyTotals(endDate: string) {
  return useQuery({
    queryKey: keys.weeklyTotals(endDate),
    queryFn: () => api<DailyMacroPointDto[]>(`/nutrition/weekly-totals?endDate=${endDate}`),
  });
}

// ── Completion toggles (optimistic, through the offline outbox) ─────────────
// networkMode "always": the toggle runs offline too — syncCompletion queues it
// and resolves, so the optimistic state stays; it only throws (→ rollback)
// when the server refused the change.

const withCompletion = <T extends { id: number; isCompleted: boolean | null }>(list: T[], id: number, isCompleted: boolean) =>
  list.map((item) => (item.id === id ? { ...item, isCompleted } : item));

export function useToggleMeal(dayId: number) {
  const qc = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) => syncCompletion({ kind: "meal", id, dayId, isCompleted }),
    onMutate: async ({ id, isCompleted }) => [
      ...(await patchCaches<MealDto[]>(qc, [keys.meals(dayId)], (l) => withCompletion(l, id, isCompleted))),
      ...(await patchCaches<TodayDashboardDto>(qc, [keys.today], (d) => ({ ...d, meals: withCompletion(d.meals, id, isCompleted) }))),
    ],
    onError: (_err, _vars, snapshot) => restore(qc, snapshot),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.meals(dayId) });
      void qc.invalidateQueries({ queryKey: keys.today });
      void qc.invalidateQueries({ queryKey: ["nutrition.weeklyTotals"] });
      void qc.invalidateQueries({ queryKey: gamificationKeys.activityStats });
    },
  });
}

export function useToggleExercise(dayId: number) {
  const qc = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      syncCompletion({ kind: "exercise", id, dayId, isCompleted }),
    onMutate: async ({ id, isCompleted }) => [
      ...(await patchCaches<ExerciseDto[]>(qc, [keys.exercises(dayId)], (l) => withCompletion(l, id, isCompleted))),
      ...(await patchCaches<TodayDashboardDto>(qc, [keys.today], (d) => ({
        ...d,
        exercises: withCompletion(d.exercises, id, isCompleted),
      }))),
    ],
    onError: (_err, _vars, snapshot) => restore(qc, snapshot),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.exercises(dayId) });
      void qc.invalidateQueries({ queryKey: keys.today });
      void qc.invalidateQueries({ queryKey: gamificationKeys.activityStats });
    },
  });
}

export function useCompleteAll(dayId: number, kind: "meals" | "exercises") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/days/${dayId}/${kind}/complete-all`, { method: "POST" }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: kind === "meals" ? keys.meals(dayId) : keys.exercises(dayId) });
      if (kind === "meals") void qc.invalidateQueries({ queryKey: ["nutrition.weeklyTotals"] });
      void qc.invalidateQueries({ queryKey: keys.today });
      void qc.invalidateQueries({ queryKey: gamificationKeys.activityStats });
    },
  });
}

export function useToggleSupplement(dayId: number, date: string) {
  const qc = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      syncCompletion({ kind: "supplement", id, dayId, date, isCompleted: completed }),
    onMutate: ({ id, completed }) =>
      patchCaches<DailySupplementDto[]>(qc, [keys.supplements(dayId)], (l) =>
        l.map((s) => (s.id === id ? { ...s, isCompleted: completed } : s)),
      ),
    onError: (_err, _vars, snapshot) => restore(qc, snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.supplements(dayId) }),
  });
}
