import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateWeeklyPlan,
  applyWeeklyPlan,
  type AIWeeklyPlan,
} from "@/actions/ai-weekly";

export function useGenerateWeeklyPlan() {
  return useMutation({
    mutationFn: ({ dateStr, userNote }: { dateStr: string; userNote?: string }) =>
      generateWeeklyPlan(dateStr, userNote),
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
      qc.refetchQueries({ queryKey: ["plans"] });
      qc.refetchQueries({ queryKey: ["meals"] });
      qc.refetchQueries({ queryKey: ["exercises"] });
      qc.refetchQueries({ queryKey: ["today-dashboard"] });
      qc.refetchQueries({ queryKey: ["week-plans-date"] });
    },
  });
}
