import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMeal, updateMeal, deleteMeal, deleteAllMeals } from "@/actions/meal-crud";

export function useCreateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      data,
    }: {
      dailyPlanId: number;
      data: {
        mealTime: string;
        mealLabel: string;
        content: string;
        calories?: number | null;
        proteinG?: string | null;
        carbsG?: string | null;
        fatG?: string | null;
      };
    }) => createMeal(dailyPlanId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}

export function useUpdateMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealId,
      data,
    }: {
      mealId: number;
      data: {
        mealTime: string;
        mealLabel: string;
        content: string;
        calories?: number | null;
        proteinG?: string | null;
        carbsG?: string | null;
        fatG?: string | null;
      };
    }) => updateMeal(mealId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mealId: number) => deleteMeal(mealId),
    onMutate: async (mealId) => {
      await qc.cancelQueries({ queryKey: ["meals"] });
      const queries = qc.getQueriesData<{ id: number }[]>({ queryKey: ["meals"] });
      for (const [key, data] of queries) {
        if (Array.isArray(data)) {
          qc.setQueryData(key, data.filter((m) => m.id !== mealId));
        }
      }
      return { queries };
    },
    onError: (_err, _mealId, context) => {
      if (context?.queries) {
        for (const [key, data] of context.queries) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}

export function useDeleteAllMeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyPlanId: number) => deleteAllMeals(dailyPlanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}
