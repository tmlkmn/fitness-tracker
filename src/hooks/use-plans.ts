import { useQuery } from "@tanstack/react-query";
import {
  getAllWeeks,
  getWeeklyPlan,
  getDailyPlan,
  getDailyPlansByWeek,
  getDailyPlansWithContentCounts,
  getSupplementsByWeek,
  getDailyPlanByDate,
  getDailyPlansForWeekByDate,
  getWeeklyPlanById,
  getDatesWithPlansForMonth,
  getTodayDashboardData,
  getEmptyWeeksBetween,
  getUpcomingDailyPlans,
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

export function useWeeklyPlanById(id: number) {
  return useQuery({
    queryKey: ["weekly-plan-id", id],
    queryFn: () => getWeeklyPlanById(id),
    enabled: !!id,
  });
}

export function useDailyPlansByWeek(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["daily-plans", weeklyPlanId],
    queryFn: () => getDailyPlansByWeek(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}

export function useDailyPlan(dailyPlanId: number, enabled = true) {
  return useQuery({
    queryKey: ["daily-plan", dailyPlanId],
    queryFn: () => getDailyPlan(dailyPlanId),
    enabled: !!dailyPlanId && enabled,
  });
}

export function useDailyPlansWithContentCounts(
  weeklyPlanId: number,
  enabled = true,
) {
  return useQuery({
    queryKey: ["daily-plans-content", weeklyPlanId],
    queryFn: () => getDailyPlansWithContentCounts(weeklyPlanId),
    enabled: !!weeklyPlanId && enabled,
  });
}

export function useSupplementsByWeek(weeklyPlanId: number) {
  return useQuery({
    queryKey: ["supplements", weeklyPlanId],
    queryFn: () => getSupplementsByWeek(weeklyPlanId),
    enabled: !!weeklyPlanId,
  });
}

export function useDailyPlanByDate(dateStr: string) {
  return useQuery({
    queryKey: ["daily-plan-date", dateStr],
    queryFn: () => getDailyPlanByDate(dateStr),
    enabled: !!dateStr,
  });
}

export function useWeekPlansByDate(dateStr: string) {
  return useQuery({
    queryKey: ["week-plans-date", dateStr],
    queryFn: () => getDailyPlansForWeekByDate(dateStr),
    enabled: !!dateStr,
  });
}

export function useDatesWithPlans(year: number, month: number) {
  return useQuery({
    queryKey: ["dates-with-plans", year, month],
    queryFn: () => getDatesWithPlansForMonth(year, month),
    enabled: !!year && !!month,
  });
}

export function useTodayDashboard() {
  return useQuery({
    queryKey: ["today-dashboard"],
    queryFn: getTodayDashboardData,
  });
}

export function useUpcomingDailyPlans() {
  return useQuery({
    queryKey: ["upcoming-daily-plans"],
    queryFn: getUpcomingDailyPlans,
  });
}

export function useEmptyWeeksBetween(
  todayStr: string,
  targetWeekStart: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["emptyWeeks", todayStr, targetWeekStart],
    queryFn: () => getEmptyWeeksBetween(todayStr, targetWeekStart),
    enabled,
  });
}
