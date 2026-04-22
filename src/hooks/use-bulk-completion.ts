import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeAllMeals, completeAllExercises } from "@/actions/bulk-completion";

interface MealItem {
  id: number;
  isCompleted: boolean | null;
  [key: string]: unknown;
}

interface ExerciseItem {
  id: number;
  isCompleted: boolean;
  [key: string]: unknown;
}

export function useBulkCompleteMeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyPlanId: number) => completeAllMeals(dailyPlanId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["meals.byDay"] });
      const queries = qc.getQueriesData<MealItem[]>({ queryKey: ["meals.byDay"] });
      for (const [key, data] of queries) {
        if (Array.isArray(data)) {
          qc.setQueryData(key, data.map((m) => ({ ...m, isCompleted: true })));
        }
      }
      return { queries };
    },
    onError: (_err, _id, context) => {
      if (context?.queries) {
        for (const [key, data] of context.queries) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["meals.byDay"] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
    },
  });
}

export function useBulkCompleteExercises() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyPlanId: number) => completeAllExercises(dailyPlanId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["exercises"] });
      const queries = qc.getQueriesData<ExerciseItem[]>({ queryKey: ["exercises"] });
      for (const [key, data] of queries) {
        if (Array.isArray(data)) {
          qc.setQueryData(key, data.map((e) => ({ ...e, isCompleted: true })));
        }
      }
      return { queries };
    },
    onError: (_err, _id, context) => {
      if (context?.queries) {
        for (const [key, data] of context.queries) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
    },
  });
}
