import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  shareWeeklyPlan,
  revokeShare,
  getMySharesForPlan,
  getPlansSharedWithMe,
  getShareableUsers,
  type ShareTarget,
} from "@/actions/sharing";

/** People the user shared a plan with before (never the whole user list). */
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

/** Resolves to the action's result — `{ ok: false, error }` for a rule the share broke. */
export function useShareWeeklyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weeklyPlanId, target }: { weeklyPlanId: number; target: ShareTarget }) =>
      shareWeeklyPlan(weeklyPlanId, target),
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: ["my-shares"] });
      queryClient.invalidateQueries({ queryKey: ["plans-shared-with-me"] });
      queryClient.invalidateQueries({ queryKey: ["shareable-users"] });
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
