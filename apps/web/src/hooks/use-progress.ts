import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProgressLogs,
  addProgressLog,
  updateProgressLog,
  deleteProgressLog,
  getLatestProgressLog,
  getProgressLogCount,
} from "@/actions/progress";

export function useProgressLogs() {
  return useQuery({
    queryKey: ["progress"],
    queryFn: () => getProgressLogs(),
  });
}

export function useAddProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addProgressLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["progress.count"] });
      queryClient.invalidateQueries({ queryKey: ["progress-latest"] });
    },
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateProgressLog>[1] }) =>
      updateProgressLog(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["progress-latest"] });
    },
  });
}

export function useDeleteProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProgressLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["progress.count"] });
      queryClient.invalidateQueries({ queryKey: ["progress-latest"] });
    },
  });
}

export function useProgressLogCount() {
  return useQuery({
    queryKey: ["progress.count"],
    queryFn: () => getProgressLogCount(),
    staleTime: 60_000,
  });
}

export function useLatestProgress() {
  return useQuery({
    queryKey: ["progress-latest"],
    queryFn: () => getLatestProgressLog(),
    staleTime: 60_000,
  });
}
