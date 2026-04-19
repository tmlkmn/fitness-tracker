import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWaterLog,
  getTodayWaterLog,
  getWaterLogs,
  incrementWater,
} from "@/actions/water";

export function useWaterLog(dateStr: string) {
  return useQuery({
    queryKey: ["water", dateStr],
    queryFn: () => getWaterLog(dateStr),
    staleTime: 30_000,
  });
}

export function useTodayWater() {
  return useQuery({
    queryKey: ["water-today"],
    queryFn: () => getTodayWaterLog(),
    staleTime: 30_000,
  });
}

export function useWaterLogs() {
  return useQuery({
    queryKey: ["water-logs"],
    queryFn: () => getWaterLogs(),
    staleTime: 60_000,
  });
}

export function useIncrementWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dateStr, delta }: { dateStr: string; delta: number }) =>
      incrementWater(dateStr, delta),
    onMutate: async ({ dateStr, delta }) => {
      await qc.cancelQueries({ queryKey: ["water", dateStr] });
      const prev = qc.getQueryData<{ glasses: number }>(["water", dateStr]);
      if (prev) {
        qc.setQueryData(["water", dateStr], {
          ...prev,
          glasses: Math.max(0, prev.glasses + delta),
        });
      }
      return { prev };
    },
    onError: (_err, { dateStr }, context) => {
      if (context?.prev) qc.setQueryData(["water", dateStr], context.prev);
    },
    onSettled: (_data, _err, { dateStr }) => {
      qc.invalidateQueries({ queryKey: ["water", dateStr] });
      qc.invalidateQueries({ queryKey: ["water-today"] });
      qc.invalidateQueries({ queryKey: ["water-logs"] });
    },
  });
}
