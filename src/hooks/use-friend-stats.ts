import { useQuery } from "@tanstack/react-query";
import { getFriendStreaks } from "@/actions/friend-stats";

export function useFriendStreaks() {
  return useQuery({
    queryKey: ["friend-stats"],
    queryFn: () => getFriendStreaks(),
    staleTime: 5 * 60_000,
  });
}
