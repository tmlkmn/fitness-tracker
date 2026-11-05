import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSleepLogByDate,
  getLatestSleepLog,
  getSleepLogs,
  upsertSleepLog,
  deleteSleepLog,
} from "@/actions/sleep";

type SleepRow = Awaited<ReturnType<typeof getSleepLogByDate>>;

// Mirror of the server-side computeDurationMinutes in src/actions/sleep.ts so
// the optimistic update shows the same duration the server will persist.
function clientDurationMinutes(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let bedMin = bh * 60 + bm;
  const wakeMin = wh * 60 + wm;
  if (bedMin >= wakeMin) bedMin -= 24 * 60;
  return wakeMin - bedMin;
}

export function useSleepByDate(dateStr: string) {
  return useQuery({
    queryKey: ["sleep", dateStr],
    queryFn: () => getSleepLogByDate(dateStr),
    staleTime: 60_000,
  });
}

export function useLatestSleep() {
  return useQuery({
    queryKey: ["sleep-latest"],
    queryFn: () => getLatestSleepLog(),
    staleTime: 60_000,
  });
}

export function useSleepLogs() {
  return useQuery({
    queryKey: ["sleep-logs"],
    queryFn: () => getSleepLogs(),
    staleTime: 60_000,
  });
}

export function useUpsertSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertSleepLog,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["sleep", vars.logDate] });
      const prev = qc.getQueryData<SleepRow>(["sleep", vars.logDate]);
      const optimistic = {
        // Preserve id/userId/timestamps when updating; synthesize for inserts.
        id: prev?.id ?? -1,
        userId: prev?.userId ?? "",
        createdAt: prev?.createdAt ?? new Date(),
        ...prev,
        logDate: vars.logDate,
        bedtime: vars.bedtime,
        wakeTime: vars.wakeTime,
        durationMinutes: clientDurationMinutes(vars.bedtime, vars.wakeTime),
        quality: vars.quality ?? null,
        notes: vars.notes ?? null,
      } as NonNullable<SleepRow>;
      qc.setQueryData(["sleep", vars.logDate], optimistic);
      return { prev };
    },
    onError: (_err, vars, context) => {
      qc.setQueryData(["sleep", vars.logDate], context?.prev ?? null);
    },
    onSettled: (_data, _err, vars) => {
      // Mark stale without an immediate refetch — refetching getSleepLogByDate
      // (a server action) would re-render the route's Server Components. The
      // optimistic row already reflects the save; reconciliation happens on
      // next mount/refetch.
      qc.invalidateQueries({ queryKey: ["sleep", vars.logDate], refetchType: "none" });
      qc.invalidateQueries({ queryKey: ["sleep-latest"], refetchType: "none" });
      qc.invalidateQueries({ queryKey: ["sleep-logs"], refetchType: "none" });
    },
  });
}

export function useDeleteSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSleepLog,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["sleep"] });
      const queries = qc.getQueriesData<SleepRow>({ queryKey: ["sleep"] });
      for (const [key, cached] of queries) {
        if (cached && cached.id === id) {
          qc.setQueryData(key, null);
        }
      }
      return { queries };
    },
    onError: (_err, _id, context) => {
      if (context?.queries) {
        for (const [key, cached] of context.queries) {
          qc.setQueryData(key, cached);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["sleep"], refetchType: "none" });
      qc.invalidateQueries({ queryKey: ["sleep-latest"], refetchType: "none" });
      qc.invalidateQueries({ queryKey: ["sleep-logs"], refetchType: "none" });
    },
  });
}
