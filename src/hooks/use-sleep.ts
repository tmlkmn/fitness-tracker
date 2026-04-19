import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSleepLogByDate,
  getLatestSleepLog,
  getSleepLogs,
  upsertSleepLog,
  deleteSleepLog,
} from "@/actions/sleep";

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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["sleep", vars.logDate] });
      qc.invalidateQueries({ queryKey: ["sleep-latest"] });
      qc.invalidateQueries({ queryKey: ["sleep-logs"] });
    },
  });
}

export function useDeleteSleep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSleepLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sleep"] });
      qc.invalidateQueries({ queryKey: ["sleep-latest"] });
      qc.invalidateQueries({ queryKey: ["sleep-logs"] });
    },
  });
}
