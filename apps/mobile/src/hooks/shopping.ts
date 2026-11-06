import type { MealRefDto, ShoppingItemDto, WeeklyPlanDto } from "@fitmusc/shared/api/dto";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { patchCaches, restore } from "./cache";

export const shoppingKeys = {
  weeks: ["weeks"] as const,
  list: (weeklyPlanId: number) => ["shopping.list", weeklyPlanId] as const,
  mealRefs: (ids: number[]) => ["meals.byIds", ids.join(",")] as const,
};

/** All weekly plans, ordered by week number. */
export function useWeeks() {
  return useQuery({ queryKey: shoppingKeys.weeks, queryFn: () => api<WeeklyPlanDto[]>("/weeks") });
}

export function useShoppingList(weeklyPlanId: number | null) {
  return useQuery({
    queryKey: shoppingKeys.list(weeklyPlanId ?? 0),
    queryFn: () => api<ShoppingItemDto[]>(`/weeks/${weeklyPlanId}/shopping-list`),
    enabled: weeklyPlanId != null,
  });
}

export function useTogglePurchased(weeklyPlanId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPurchased }: { id: number; isPurchased: boolean }) =>
      api(`/shopping-items/${id}/purchased`, { method: "PUT", body: { isPurchased } }),
    onMutate: ({ id, isPurchased }) =>
      patchCaches<ShoppingItemDto[]>(qc, [shoppingKeys.list(weeklyPlanId)], (list) =>
        list.map((item) => (item.id === id ? { ...item, isPurchased } : item)),
      ),
    onError: (_err, _vars, snapshot) => restore(qc, snapshot),
    onSettled: () => qc.invalidateQueries({ queryKey: shoppingKeys.list(weeklyPlanId) }),
  });
}

/** Rebuilds the week's list from its meals with AI (counts against the AI quota). */
export function useGenerateShoppingList(weeklyPlanId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/weeks/${weeklyPlanId}/shopping-list`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: shoppingKeys.list(weeklyPlanId) }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ai.quota"] }),
  });
}

/** The meals a shopping item came from (the endpoint takes up to 100 ids). */
export function useMealRefs(allIds: number[], enabled: boolean) {
  const ids = allIds.slice(0, 100);
  return useQuery({
    queryKey: shoppingKeys.mealRefs(ids),
    queryFn: () => api<MealRefDto[]>(`/meals/by-ids?ids=${ids.join(",")}`),
    enabled: enabled && ids.length > 0,
    staleTime: 5 * 60_000,
  });
}
