import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateDailyMeals,
  applyDailyMeals,
  type AIMeal,
} from "@/actions/ai-meals";

export function useGenerateDailyMeals() {
  return useMutation({
    mutationFn: ({ dailyPlanId, userNote }: { dailyPlanId: number; userNote?: string }) =>
      generateDailyMeals(dailyPlanId, userNote),
  });
}

export function useApplyDailyMeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      meals,
    }: {
      dailyPlanId: number;
      meals: AIMeal[];
    }) => applyDailyMeals(dailyPlanId, meals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}
