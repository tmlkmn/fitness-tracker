import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeAllMeals, completeAllExercises } from "@/actions/bulk-completion";

export function useBulkCompleteMeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyPlanId: number) => completeAllMeals(dailyPlanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
    },
  });
}

export function useBulkCompleteExercises() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyPlanId: number) => completeAllExercises(dailyPlanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
    },
  });
}
