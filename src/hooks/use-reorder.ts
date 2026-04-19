import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reorderMeals, reorderExercises } from "@/actions/reorder";

export function useReorderMeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      orderedIds,
    }: {
      dailyPlanId: number;
      orderedIds: number[];
    }) => reorderMeals(dailyPlanId, orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}

export function useReorderExercises() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      orderedIds,
    }: {
      dailyPlanId: number;
      orderedIds: number[];
    }) => reorderExercises(dailyPlanId, orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
