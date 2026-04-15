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
    onSuccess: () => {
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
