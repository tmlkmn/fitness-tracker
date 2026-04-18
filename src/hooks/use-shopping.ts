import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getShoppingList, toggleShoppingItem, generateShoppingList } from "@/actions/shopping";

export function useShoppingList(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["shopping", weeklyPlanId],
    queryFn: () => getShoppingList(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}

export function useToggleShopping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isPurchased,
    }: {
      id: number;
      isPurchased: boolean;
    }) => toggleShoppingItem(id, isPurchased),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopping"] });
    },
  });
}

export function useGenerateShoppingList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weeklyPlanId: number) => generateShoppingList(weeklyPlanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping"] });
    },
  });
}
