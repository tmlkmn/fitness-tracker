import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSupplementCompletions,
  toggleSupplementCompletion,
} from "@/actions/supplement-completion";

export function useSupplementCompletions(weeklyPlanId: number, date: string) {
  return useQuery({
    queryKey: ["supplement-completions", weeklyPlanId, date],
    queryFn: () => getSupplementCompletions(weeklyPlanId, date),
    enabled: !!weeklyPlanId && !!date,
    staleTime: 60_000,
  });
}

export function useToggleSupplementCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplementId,
      date,
      completed,
    }: {
      supplementId: number;
      date: string;
      completed: boolean;
    }) => toggleSupplementCompletion(supplementId, date, completed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplement-completions"] });
    },
  });
}
