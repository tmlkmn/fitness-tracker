import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUserFoods,
  createUserFood,
  deleteUserFood,
  type UserFoodInput,
} from "@/actions/user-foods";

export function useUserFoods() {
  return useQuery({
    queryKey: ["user-foods"],
    queryFn: () => listUserFoods(),
    staleTime: 60_000,
  });
}

export function useCreateUserFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserFoodInput) => createUserFood(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-foods"] }),
  });
}

export function useDeleteUserFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUserFood(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-foods"] }),
  });
}
