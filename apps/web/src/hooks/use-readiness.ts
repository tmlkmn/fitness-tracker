import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReadinessLog,
  getTodayReadinessLog,
  upsertReadinessLog,
  computeTodayReadiness,
  getReadinessByDateRange,
} from "@/actions/readiness";

export function useReadinessByDate(dateStr: string) {
  return useQuery({
    queryKey: ["readiness.byDate", dateStr],
    queryFn: () => getReadinessLog(dateStr),
    staleTime: 30_000,
  });
}

export function useTodayReadinessLog() {
  return useQuery({
    queryKey: ["readiness.today.log"],
    queryFn: () => getTodayReadinessLog(),
    staleTime: 30_000,
  });
}

export function useTodayReadinessScore() {
  return useQuery({
    queryKey: ["readiness.today.score"],
    queryFn: () => computeTodayReadiness(),
    // Recompute every 5 min in the background — score depends on rolling
    // 24h sleep + yesterday compliance, so it shifts slowly.
    staleTime: 5 * 60_000,
  });
}

export function useReadinessRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["readiness.range", startDate, endDate],
    queryFn: () => getReadinessByDateRange(startDate, endDate),
    staleTime: 5 * 60_000,
  });
}

export function useUpsertReadiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      logDate?: string;
      energyRating: number | null;
      painScore: number | null;
      notes?: string | null;
    }) => upsertReadinessLog(input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["readiness.today.log"] });
      qc.invalidateQueries({ queryKey: ["readiness.today.score"] });
      qc.invalidateQueries({ queryKey: ["readiness.range"] });
      if (vars.logDate) {
        qc.invalidateQueries({
          queryKey: ["readiness.byDate", vars.logDate],
        });
      }
    },
  });
}
