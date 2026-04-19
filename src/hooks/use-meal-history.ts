import { useQuery } from "@tanstack/react-query";
import { getRecentMealsByLabel, getFrequentRecentMeals } from "@/actions/meal-history";

export function useRecentMealsByLabel(
  mealLabel: string,
  excludeDailyPlanId: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["meal-history", mealLabel, excludeDailyPlanId],
    queryFn: () => getRecentMealsByLabel(mealLabel, excludeDailyPlanId),
    enabled: enabled && !!mealLabel,
    staleTime: 60_000,
  });
}

export function useFrequentMeals() {
  return useQuery({
    queryKey: ["frequent-meals"],
    queryFn: () => getFrequentRecentMeals(),
    staleTime: 60_000,
  });
}
