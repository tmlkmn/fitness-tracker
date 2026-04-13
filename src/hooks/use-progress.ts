import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProgressLogs, addProgressLog } from "@/actions/progress";

export function useProgressLogs(userId: number) {
  return useQuery({
    queryKey: ["progress", userId],
    queryFn: () => getProgressLogs(userId),
  });
}

export function useAddProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addProgressLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });
}
