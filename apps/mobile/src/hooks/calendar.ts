import type {
  CalendarDayDto,
  DailyPlanDto,
  DailyPlanSummaryDto,
  NotificationPreferencesDto,
} from "@fitmusc/shared/api/dto";
import type { WeekStart } from "@fitmusc/shared/week";
import { useQueries, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const calendarKeys = {
  month: (year: number, month: number) => ["calendar.month", year, month] as const,
  byDate: (date: string) => ["day.byDate", date] as const,
  daySummaries: (weeklyPlanId: number) => ["week.daySummaries", weeklyPlanId] as const,
  preferences: ["me.notificationPreferences"] as const,
};

/** The user's first day of the week (settings → notifications on the web). */
export function useWeekStart(): WeekStart {
  const prefs = useQuery({
    queryKey: calendarKeys.preferences,
    queryFn: () => api<NotificationPreferencesDto>("/me/notification-preferences"),
    staleTime: 10 * 60_000,
  });
  return prefs.data?.weekStartsOn === "sunday" ? "sunday" : "monday";
}

/** Plan type per date for every month in `months` (a week can span two). */
export function usePlanTypes(months: { year: number; month: number }[]) {
  const results = useQueries({
    queries: months.map(({ year, month }) => ({
      queryKey: calendarKeys.month(year, month),
      queryFn: () => api<CalendarDayDto[]>(`/calendar/month?year=${year}&month=${month}`),
    })),
  });
  const byDate = new Map<string, string>();
  for (const result of results) for (const day of result.data ?? []) byDate.set(day.date, day.planType);
  return {
    byDate,
    isRefetching: results.some((r) => r.isRefetching),
    refetch: () => Promise.all(results.map((r) => r.refetch())),
  };
}

/** null when the date has no plan. */
export function useDayByDate(date: string) {
  return useQuery({ queryKey: calendarKeys.byDate(date), queryFn: () => api<DailyPlanDto | null>(`/days/by-date/${date}`) });
}

export function useDaySummaries(weeklyPlanId: number | null | undefined) {
  return useQuery({
    queryKey: calendarKeys.daySummaries(weeklyPlanId ?? 0),
    queryFn: () => api<DailyPlanSummaryDto[]>(`/weeks/${weeklyPlanId}/day-summaries`),
    enabled: weeklyPlanId != null,
  });
}
