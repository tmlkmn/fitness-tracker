import { useQuery } from "@tanstack/react-query";
import { getExercisesFromPreviousWeek } from "@/actions/exercise-history";

export function usePreviousWeekExercises(dailyPlanId: number, enabled = true) {
  return useQuery({
    queryKey: ["prev-week-exercises", dailyPlanId],
    queryFn: () => getExercisesFromPreviousWeek(dailyPlanId),
    enabled,
    staleTime: 60_000,
  });
}
