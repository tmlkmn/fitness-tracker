import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getShoppingList, toggleShoppingItem } from "@/actions/shopping";

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
