import { useQuery } from "@tanstack/react-query";
import {
  getSharedWeeklyPlan,
  getSharedDailyPlansByWeek,
  getSharedDailyPlan,
  getSharedMealsByDay,
  getSharedExercisesByDay,
  getSharedSupplementsByWeek,
  getSharedShoppingList,
} from "@/actions/shared-plans";

export function useSharedWeeklyPlan(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["shared-weekly-plan", weeklyPlanId],
    queryFn: () => getSharedWeeklyPlan(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}

export function useSharedDailyPlansByWeek(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["shared-daily-plans", weeklyPlanId],
    queryFn: () => getSharedDailyPlansByWeek(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}

export function useSharedDailyPlan(dailyPlanId: number) {
  return useQuery({
    queryKey: ["shared-daily-plan", dailyPlanId],
    queryFn: () => getSharedDailyPlan(dailyPlanId),
    enabled: !!dailyPlanId,
  });
}

export function useSharedMealsByDay(dailyPlanId: number) {
  return useQuery({
    queryKey: ["shared-meals", dailyPlanId],
    queryFn: () => getSharedMealsByDay(dailyPlanId),
    enabled: !!dailyPlanId,
  });
}

export function useSharedExercisesByDay(dailyPlanId: number) {
  return useQuery({
    queryKey: ["shared-exercises", dailyPlanId],
    queryFn: () => getSharedExercisesByDay(dailyPlanId),
    enabled: !!dailyPlanId,
  });
}

export function useSharedSupplementsByWeek(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["shared-supplements", weeklyPlanId],
    queryFn: () => getSharedSupplementsByWeek(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}

export function useSharedShoppingList(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["shared-shopping", weeklyPlanId],
    queryFn: () => getSharedShoppingList(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}
