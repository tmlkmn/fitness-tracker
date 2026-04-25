import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWaterLog,
  getTodayWaterLog,
  getWaterLogs,
  getDailyWaterTarget,
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

export function useDailyWaterTarget(dateStr: string) {
  return useQuery({
    queryKey: ["water-target", dateStr],
    queryFn: () => getDailyWaterTarget(dateStr),
    staleTime: 5 * 60_000, // target depends on profile + plan; 5 min cache is fine
  });
}

export function useWaterLogs() {
  return useQuery({
    queryKey: ["water-logs"],
    queryFn: () => getWaterLogs(),
    staleTime: 60_000,
  });
}

type WaterCacheRow = {
  glasses: number;
  targetGlasses?: number;
} | null | undefined;

export function useIncrementWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dateStr, delta }: { dateStr: string; delta: number }) =>
      incrementWater(dateStr, delta),
    onMutate: async ({ dateStr, delta }) => {
      await qc.cancelQueries({ queryKey: ["water", dateStr] });
      await qc.cancelQueries({ queryKey: ["water-today"] });
      const prev = qc.getQueryData<WaterCacheRow>(["water", dateStr]);
      const prevToday = qc.getQueryData<WaterCacheRow>(["water-today"]);

      // Synthesize a base row when no log exists yet so the UI updates
      // immediately on the first +/- click. Without this, prev=null skipped
      // the optimistic write and the user saw no response until the refetch.
      const baseGlasses = prev?.glasses ?? 0;
      const nextGlasses = Math.max(0, baseGlasses + delta);
      qc.setQueryData(["water", dateStr], {
        ...(prev ?? {}),
        glasses: nextGlasses,
      });

      const baseTodayGlasses = prevToday?.glasses ?? 0;
      qc.setQueryData(["water-today"], {
        ...(prevToday ?? {}),
        glasses: Math.max(0, baseTodayGlasses + delta),
      });

      return { prev, prevToday };
    },
    onError: (_err, { dateStr }, context) => {
      qc.setQueryData(["water", dateStr], context?.prev ?? null);
      qc.setQueryData(["water-today"], context?.prevToday ?? null);
    },
    onSettled: (_data, _err, { dateStr }) => {
      qc.invalidateQueries({ queryKey: ["water", dateStr] });
      qc.invalidateQueries({ queryKey: ["water-today"] });
      qc.invalidateQueries({ queryKey: ["water-logs"] });
    },
  });
}
