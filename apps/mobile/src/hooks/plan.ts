import type {
  DailyPlanDto,
  DailySupplementDto,
  ExerciseDto,
  MacroTargetsForDayDto,
  MealDto,
  TodayDashboardDto,
} from "@fitmusc/shared/api/dto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { patchCaches, restore } from "./cache";

export const keys = {
  today: ["dashboard.today"] as const,
  day: (dayId: number) => ["day", dayId] as const,
  meals: (dayId: number) => ["day.meals", dayId] as const,
  exercises: (dayId: number) => ["day.exercises", dayId] as const,
  supplements: (dayId: number) => ["day.supplements", dayId] as const,
  macroTargets: (planType: string | null) => ["macros.forDay", planType] as const,
};

export function useTodayDashboard() {
  return useQuery({ queryKey: keys.today, queryFn: () => api<TodayDashboardDto>("/dashboard/today") });
}

export function useDay(dayId: number) {
  return useQuery({ queryKey: keys.day(dayId), queryFn: () => api<DailyPlanDto>(`/days/${dayId}`) });
}

export function useDayMeals(dayId: number) {
  return useQuery({ queryKey: keys.meals(dayId), queryFn: () => api<MealDto[]>(`/days/${dayId}/meals`) });
}

export function useDayExercises(dayId: number) {
  return useQuery({ queryKey: keys.exercises(dayId), queryFn: () => api<ExerciseDto[]>(`/days/${dayId}/exercises`) });
}

export function useDaySupplements(dayId: number | undefined) {
  return useQuery({
    queryKey: keys.supplements(dayId ?? 0),
    queryFn: () => api<DailySupplementDto[]>(`/days/${dayId}/supplements`),
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

// ── Completion toggles (optimistic) ─────────────────────────────────────────

const withCompletion = <T extends { id: number; isCompleted: boolean | null }>(list: T[], id: number, isCompleted: boolean) =>
  list.map((item) => (item.id === id ? { ...item, isCompleted } : item));

export function useToggleMeal(dayId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      api(`/meals/${id}/completion`, { method: "PUT", body: { isCompleted } }),
    onMutate: async ({ id, isCompleted }) => [
      ...(await patchCaches<MealDto[]>(qc, [keys.meals(dayId)], (l) => withCompletion(l, id, isCompleted))),
      ...(await patchCaches<TodayDashboardDto>(qc, [keys.today], (d) => ({ ...d, meals: withCompletion(d.meals, id, isCompleted) }))),
    ],
    onError: (_err, _vars, snapshot) => restore(qc, snapshot),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.meals(dayId) });
      void qc.invalidateQueries({ queryKey: keys.today });
    },
  });
}

export function useToggleExercise(dayId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isCompleted }: { id: number; isCompleted: boolean }) =>
      api(`/exercises/${id}/completion`, { method: "PUT", body: { isCompleted } }),
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
    },
  });
}

export function useCompleteAll(dayId: number, kind: "meals" | "exercises") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/days/${dayId}/${kind}/complete-all`, { method: "POST" }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: kind === "meals" ? keys.meals(dayId) : keys.exercises(dayId) });
      void qc.invalidateQueries({ queryKey: keys.today });
    },
  });
}

export function useToggleSupplement(dayId: number, date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, completed }: { id: number; completed: boolean }) =>
      api(`/supplements/${id}/completions/${date}`, { method: "PUT", body: { completed } }),
    onMutate: ({ id, completed }) =>
      patchCaches<DailySupplementDto[]>(qc, [keys.supplements(dayId)], (l) =>
        l.map((s) => (s.id === id ? { ...s, isCompleted: completed } : s)),
      ),
    onError: (_err, _vars, snapshot) => restore(qc, snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.supplements(dayId) }),
  });
}
