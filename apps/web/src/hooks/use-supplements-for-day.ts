import { useQuery } from "@tanstack/react-query";
import { getSupplementsForDailyPlan } from "@/actions/supplement-completion";

export function useSupplementsForDay(dailyPlanId: number) {
  return useQuery({
    queryKey: ["supplements.byDay", dailyPlanId],
    queryFn: () => getSupplementsForDailyPlan(dailyPlanId),
    enabled: !!dailyPlanId,
    staleTime: 60_000,
    meta: { persist: true },
  });
}
