import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSupplementCompletions,
  type DailySupplementRow,
} from "@/actions/supplement-completion";
import { enqueueOutbox } from "@/lib/outbox";
import { drainOutbox } from "@/lib/outbox-drain";

export function useSupplementCompletions(weeklyPlanId: number, date: string) {
  return useQuery({
    queryKey: ["supplement-completions", weeklyPlanId, date],
    queryFn: () => getSupplementCompletions(weeklyPlanId, date),
    enabled: !!weeklyPlanId && !!date,
    staleTime: 60_000,
    meta: { persist: true },
  });
}

export function useToggleSupplementCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplementId,
      date,
      completed,
    }: {
      supplementId: number;
      date: string;
      completed: boolean;
    }) => {
      await enqueueOutbox("supplement", { supplementId, date, completed });
      void drainOutbox(qc);
      return { queued: true } as const;
    },
    onMutate: async ({ supplementId, date, completed }) => {
      await qc.cancelQueries({ queryKey: ["supplement-completions"] });
      await qc.cancelQueries({ queryKey: ["supplements.byDay"] });

      // Patch the id-list cache (supplement-completions)
      const idQueries = qc.getQueriesData<number[]>({
        queryKey: ["supplement-completions"],
      });
      for (const [key, data] of idQueries) {
        if (Array.isArray(key) && key[2] !== date) continue;
        if (!data) continue;
        let next: number[];
        if (!completed) {
          next = data.filter((id) => id !== supplementId);
        } else if (data.includes(supplementId)) {
          next = data;
        } else {
          next = [...data, supplementId];
        }
        qc.setQueryData<number[]>(key, next);
      }

      // Patch the row cache (supplements.byDay) — flip isCompleted on matching row
      const rowQueries = qc.getQueriesData<DailySupplementRow[]>({
        queryKey: ["supplements.byDay"],
      });
      for (const [key, data] of rowQueries) {
        if (!data) continue;
        qc.setQueryData<DailySupplementRow[]>(
          key,
          data.map((s) =>
            s.id === supplementId ? { ...s, isCompleted: completed } : s,
          ),
        );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supplement-completions"] });
      qc.invalidateQueries({ queryKey: ["supplements.byDay"] });
    },
  });
}
