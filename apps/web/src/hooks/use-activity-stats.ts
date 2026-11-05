import { useQuery } from "@tanstack/react-query";
import { getActivityStats } from "@/actions/activity-stats";

export function useActivityStats() {
  return useQuery({
    queryKey: ["activity-stats"],
    queryFn: () => getActivityStats(),
    staleTime: 5 * 60_000,
  });
}
