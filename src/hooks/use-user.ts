import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserProfile,
  updateUserWeightTargets,
  markOnboardingSeen,
  getResolvedMacroTargets,
  getDefaultMacroTargets,
  updateHealthProfile,
} from "@/actions/user";

export function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: () => getUserProfile(),
  });
}

export function useResolvedMacroTargets() {
  return useQuery({
    queryKey: ["macro.resolved"],
    queryFn: () => getResolvedMacroTargets(),
    staleTime: 60_000,
  });
}

export function useDefaultMacroTargets() {
  return useMutation({
    mutationFn: () => getDefaultMacroTargets(),
  });
}

export function useUpdateHealthProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateHealthProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["macro.resolved"] });
    },
  });
}

export function useUpdateUserWeightTargets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserWeightTargets,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["macro.resolved"] });
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
