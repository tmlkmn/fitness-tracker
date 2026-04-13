import { useQuery } from "@tanstack/react-query";
import {
  getAllWeeks,
  getWeeklyPlan,
  getDailyPlansByWeek,
  getSupplementsByWeek,
} from "@/actions/plans";

export function useAllWeeks() {
  return useQuery({
    queryKey: ["weeks"],
    queryFn: getAllWeeks,
  });
}

export function useWeeklyPlan(weekNumber: number) {
  return useQuery({
    queryKey: ["weekly-plan", weekNumber],
    queryFn: () => getWeeklyPlan(weekNumber),
    enabled: !!weekNumber,
  });
}

export function useDailyPlansByWeek(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["daily-plans", weeklyPlanId],
    queryFn: () => getDailyPlansByWeek(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}

export function useSupplementsByWeek(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["supplements", weeklyPlanId],
    queryFn: () => getSupplementsByWeek(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}
