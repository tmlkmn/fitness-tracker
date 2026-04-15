import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProgressLogs, addProgressLog } from "@/actions/progress";

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
    },
  });
}
