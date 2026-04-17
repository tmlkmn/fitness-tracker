import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, updateUserWeightTargets, markOnboardingSeen } from "@/actions/user";

export function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: () => getUserProfile(),
  });
}

export function useUpdateUserWeightTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserWeightTargets,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}

export function useMarkOnboardingSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markOnboardingSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });
}
