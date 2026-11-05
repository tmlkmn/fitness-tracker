import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  shareWeeklyPlan,
  revokeShare,
  getMySharesForPlan,
  getPlansSharedWithMe,
  getShareableUsers,
} from "@/actions/sharing";

export function useShareableUsers() {
  return useQuery({
    queryKey: ["shareable-users"],
    queryFn: getShareableUsers,
  });
}

export function usePlansSharedWithMe() {
  return useQuery({
    queryKey: ["plans-shared-with-me"],
    queryFn: getPlansSharedWithMe,
  });
}

export function useMySharesForPlan(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["my-shares", weeklyPlanId],
    queryFn: () => getMySharesForPlan(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}

export function useShareWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      weeklyPlanId,
      sharedWithUserId,
    }: {
      weeklyPlanId: number;
      sharedWithUserId: string;
    }) => shareWeeklyPlan(weeklyPlanId, sharedWithUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-shares"] });
      queryClient.invalidateQueries({ queryKey: ["plans-shared-with-me"] });
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: number) => revokeShare(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-shares"] });
      queryClient.invalidateQueries({ queryKey: ["plans-shared-with-me"] });
    },
  });
}
