import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateWeeklyPlan,
  applyWeeklyPlan,
  type AIWeeklyPlan,
} from "@/actions/ai-weekly";

export function useGenerateWeeklyPlan() {
  return useMutation({
    mutationFn: (dateStr: string) => generateWeeklyPlan(dateStr),
  });
}

export function useApplyWeeklyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dateStr,
      plan,
    }: {
      dateStr: string;
      plan: AIWeeklyPlan;
    }) => applyWeeklyPlan(dateStr, plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["meals"] });
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
