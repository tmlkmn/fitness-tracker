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
      await qc.cancelQueries({ queryKey: ["water-today"] });
      const prev = qc.getQueryData<{ glasses: number }>(["water", dateStr]);
      const prevToday = qc.getQueryData<{ glasses: number }>(["water-today"]);
      if (prev) {
        qc.setQueryData(["water", dateStr], {
          ...prev,
          glasses: Math.max(0, prev.glasses + delta),
        });
      }
      if (prevToday) {
        qc.setQueryData(["water-today"], {
          ...prevToday,
          glasses: Math.max(0, prevToday.glasses + delta),
        });
      }
      return { prev, prevToday };
    },
    onError: (_err, { dateStr }, context) => {
      if (context?.prev) qc.setQueryData(["water", dateStr], context.prev);
      if (context?.prevToday) qc.setQueryData(["water-today"], context.prevToday);
    },
    onSettled: (_data, _err, { dateStr }) => {
      qc.invalidateQueries({ queryKey: ["water", dateStr] });
      qc.invalidateQueries({ queryKey: ["water-today"] });
      qc.invalidateQueries({ queryKey: ["water-logs"] });
    },
  });
}
