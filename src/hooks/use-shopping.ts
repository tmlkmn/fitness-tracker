import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getShoppingList, toggleShoppingItem, generateShoppingList } from "@/actions/shopping";

type ShoppingItem = Awaited<ReturnType<typeof getShoppingList>>[number];

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
    onMutate: async ({ id, isPurchased }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["shopping"] });

      // Snapshot all shopping queries
      const queries = queryClient.getQueriesData<ShoppingItem[]>({ queryKey: ["shopping"] });
      const snapshots: [readonly unknown[], ShoppingItem[] | undefined][] = [];

      for (const [key, data] of queries) {
        if (!data) continue;
        snapshots.push([key, data]);
        queryClient.setQueryData<ShoppingItem[]>(key, (old) =>
          old?.map((item) =>
            item.id === id ? { ...item, isPurchased } : item
          )
        );
      }

      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
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
