import type { ProgressLogDto, SleepLogDto, UserProfileDto, WaterLogDto, WaterTargetDto } from "@fitmusc/shared/api/dto";
import type { progressLogSchema, sleepLogSchema } from "@fitmusc/shared/api/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";

import { api } from "@/lib/api";

import { patchCaches, restore } from "./cache";

/** Charts show this many latest days. */
export const CHART_DAYS = 14;

export const wellnessKeys = {
  water: (date: string) => ["water", date] as const,
  waterTarget: (date: string) => ["water.target", date] as const,
  waterLogs: ["water.logs"] as const,
  sleep: (date: string) => ["sleep.byDate", date] as const,
  sleepLogs: ["sleep.logs"] as const,
  progressLogs: ["progress.logs"] as const,
  profile: ["me.profile"] as const,
};

// ── Water ───────────────────────────────────────────────────────────────────

export function useWater(date: string) {
  const log = useQuery({ queryKey: wellnessKeys.water(date), queryFn: () => api<WaterLogDto | null>(`/water/${date}`) });
  const target = useQuery({
    queryKey: wellnessKeys.waterTarget(date),
    queryFn: () => api<WaterTargetDto>(`/water/${date}/target`),
    staleTime: 5 * 60_000,
  });
  return {
    glasses: log.data?.glasses ?? 0,
    target: log.data?.targetGlasses ?? target.data?.targetGlasses ?? 8,
    isLoading: log.isLoading,
  };
}

export function useAddWater(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (delta: number) => api(`/water/${date}/increment`, { method: "POST", body: { delta } }),
    onMutate: (delta) => {
      // No row until the first glass: show it right away with the expected target.
      const targetGlasses = qc.getQueryData<WaterTargetDto>(wellnessKeys.waterTarget(date))?.targetGlasses ?? 8;
      return patchCaches<WaterLogDto | null>(qc, [wellnessKeys.water(date)], (log) =>
        log
          ? { ...log, glasses: Math.max(0, log.glasses + delta) }
          : { id: 0, userId: "", logDate: date, glasses: Math.max(0, delta), targetGlasses, createdAt: null },
      );
    },
    onError: (_err, _vars, snapshot) => restore(qc, snapshot),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: wellnessKeys.water(date) });
      void qc.invalidateQueries({ queryKey: wellnessKeys.waterLogs });
    },
  });
}

export function useWaterLogs() {
  return useQuery({
    queryKey: wellnessKeys.waterLogs,
    queryFn: () => api<WaterLogDto[]>(`/water?limit=${CHART_DAYS}`),
  });
}

// ── Sleep ───────────────────────────────────────────────────────────────────

export function useSleep(date: string) {
  return useQuery({
    queryKey: wellnessKeys.sleep(date),
    queryFn: () => api<SleepLogDto | null>(`/sleep-logs/by-date/${date}`),
    enabled: date !== "",
  });
}

export function useSleepLogs() {
  return useQuery({
    queryKey: wellnessKeys.sleepLogs,
    queryFn: () => api<SleepLogDto[]>(`/sleep-logs?limit=${CHART_DAYS}`),
  });
}

function useInvalidateSleep(date: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: wellnessKeys.sleep(date) });
    void qc.invalidateQueries({ queryKey: wellnessKeys.sleepLogs });
  };
}

export function useSaveSleep(date: string) {
  const invalidate = useInvalidateSleep(date);
  return useMutation({
    mutationFn: (body: z.input<typeof sleepLogSchema>) => api("/sleep-logs", { method: "PUT", body }),
    onSuccess: invalidate,
  });
}

export function useDeleteSleep(date: string) {
  const invalidate = useInvalidateSleep(date);
  return useMutation({
    mutationFn: (id: number) => api(`/sleep-logs/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

// ── Progress logs ───────────────────────────────────────────────────────────

export function useProgressLogs() {
  return useQuery({ queryKey: wellnessKeys.progressLogs, queryFn: () => api<ProgressLogDto[]>("/progress-logs") });
}

export function useProfile() {
  return useQuery({ queryKey: wellnessKeys.profile, queryFn: () => api<UserProfileDto>("/me/profile"), staleTime: 5 * 60_000 });
}

export type ProgressLogInput = z.input<typeof progressLogSchema>;

export function useSaveProgressLog(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProgressLogInput) =>
      id == null ? api("/progress-logs", { method: "POST", body }) : api(`/progress-logs/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: wellnessKeys.progressLogs }),
  });
}

export function useDeleteProgressLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/progress-logs/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: wellnessKeys.progressLogs }),
  });
}
