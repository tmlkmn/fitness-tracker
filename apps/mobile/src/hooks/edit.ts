import type { ExerciseLibraryEntryDto, IdDto, MealPickerDto, PreviousExerciseDto, UserFoodDto } from "@fitmusc/shared/api/dto";
import type { ExerciseInputBody, MealInputBody, UserFoodBody } from "@fitmusc/shared/api/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { calendarKeys } from "./calendar";
import { keys } from "./plan";

// Meal / exercise create-update-delete. Updates are PUT: the server overwrites
// every field, so callers send the whole record (including the meal's icon).

/** Everything a change to a day's meals or exercises can make stale. */
export function useInvalidateDay(dayId: number, kind: "meals" | "exercises") {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: kind === "meals" ? keys.meals(dayId) : keys.exercises(dayId) });
    void qc.invalidateQueries({ queryKey: keys.today });
    void qc.invalidateQueries({ queryKey: ["week.daySummaries"] });
    if (kind === "meals") {
      void qc.invalidateQueries({ queryKey: ["meals.picker"] });
      // Deleting a meal also drops it from the shopping items that referenced it.
      void qc.invalidateQueries({ queryKey: ["shopping.list"] });
      void qc.invalidateQueries({ queryKey: ["meals.byIds"] });
    }
  };
}

export function useSaveMeal(dayId: number, mealId: number | null) {
  const invalidate = useInvalidateDay(dayId, "meals");
  return useMutation({
    mutationFn: (body: MealInputBody) =>
      mealId == null
        ? api<IdDto>(`/days/${dayId}/meals`, { method: "POST", body })
        : api(`/meals/${mealId}`, { method: "PUT", body }),
    onSuccess: invalidate,
  });
}

export function useDeleteMeal(dayId: number) {
  const invalidate = useInvalidateDay(dayId, "meals");
  return useMutation({
    mutationFn: (mealId: number) => api(`/meals/${mealId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/** Adds a meal to the "saved" picker tab (the web's "save as favourite"). */
export function useSaveFavoriteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Pick<MealInputBody, "mealLabel" | "content" | "calories" | "proteinG" | "carbsG" | "fatG">) =>
      api("/saved-meals", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meals.picker"] }),
  });
}

export function useMealPicker(query: string, excludeDayId: number, enabled: boolean) {
  const q = query.trim();
  return useQuery({
    queryKey: ["meals.picker", q, excludeDayId],
    queryFn: () =>
      api<MealPickerDto>(`/meals/picker?excludeDayId=${excludeDayId}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
    enabled,
    placeholderData: (previous) => previous,
  });
}

/** The user's own foods for the food reference (the web's "Mine" tab). */
export function useUserFoods(enabled: boolean) {
  return useQuery({ queryKey: ["userFoods.list"], queryFn: () => api<UserFoodDto[]>("/user-foods"), enabled });
}

export function useCreateUserFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UserFoodBody) => api<IdDto>("/user-foods", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userFoods.list"] }),
  });
}

export function useDeleteUserFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/user-foods/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["userFoods.list"] }),
  });
}

export function useSaveExercise(dayId: number, exerciseId: number | null) {
  const invalidate = useInvalidateDay(dayId, "exercises");
  return useMutation({
    mutationFn: (body: ExerciseInputBody) =>
      exerciseId == null
        ? api<IdDto>(`/days/${dayId}/exercises`, { method: "POST", body })
        : api(`/exercises/${exerciseId}`, { method: "PUT", body }),
    onSuccess: invalidate,
  });
}

export function useDeleteExercise(dayId: number) {
  const invalidate = useInvalidateDay(dayId, "exercises");
  return useMutation({
    mutationFn: (exerciseId: number) => api(`/exercises/${exerciseId}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

/** Name suggestions from the exercise library (English names; needs 2+ characters). */
export function useExerciseSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["exercises.library", q.toLowerCase()],
    queryFn: () => api<ExerciseLibraryEntryDto[]>(`/exercise-library?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
    staleTime: 10 * 60_000,
    placeholderData: (previous) => previous,
  });
}

/** "Copy last week": the same weekday's exercises from the previous week, added in one request. */
export function useCopyLastWeek(dayId: number) {
  const qc = useQueryClient();
  const invalidate = useInvalidateDay(dayId, "exercises");
  const copy = useMutation({
    mutationFn: (items: ExerciseInputBody[]) => api(`/days/${dayId}/exercises/bulk`, { method: "POST", body: { items } }),
    onSuccess: invalidate,
  });
  const fetchPrevious = () =>
    qc.fetchQuery({
      queryKey: ["exercises.previousWeek", dayId],
      queryFn: () => api<PreviousExerciseDto[]>(`/days/${dayId}/exercises/previous-week`),
      staleTime: 0,
    });
  return { copy, fetchPrevious };
}

/** Creates the week/day rows for a date without a plan (idempotent) and returns the day id. */
export function useEnsureDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => api<IdDto>("/days", { method: "POST", body: { date } }),
    onSuccess: (_result, date) => {
      void qc.invalidateQueries({ queryKey: calendarKeys.byDate(date) });
      void qc.invalidateQueries({ queryKey: ["calendar.month"] });
      void qc.invalidateQueries({ queryKey: keys.today });
      void qc.invalidateQueries({ queryKey: ["weeks"] });
    },
  });
}
