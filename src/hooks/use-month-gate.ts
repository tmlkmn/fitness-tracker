"use client";

import { useMemo } from "react";
import { useEmptyWeeksInMonth } from "@/hooks/use-plans";

/**
 * Month gate — prevents users from generating AI plans (weekly or daily) for
 * a month that comes AFTER the current (today's) month, until every week
 * belonging to the current month has a plan with real content.
 *
 * Rationale: avoids "pre-generate the whole year, screenshot, churn" loops
 * that defeat the app's workflow. See Faz 4 issue #3.
 */
export interface MonthGateResult {
  /** True when the gate is ready (data loaded). False during initial fetch. */
  ready: boolean;
  /** Monday date strings (YYYY-MM-DD) of empty weeks in the current month. */
  emptyWeeksInCurrentMonth: string[];
  /** True when current month has ≥ 1 empty/missing week. */
  hasCurrentMonthGap: boolean;
  /**
   * Returns true if AI generation/apply is blocked for the given target date.
   * Blocked iff target date's month > today's month AND current month has a gap.
   */
  isBlockedForDate: (dateStr: string) => boolean;
  /** Human-readable month name for the current month (e.g., "Nisan"). */
  currentMonthLabel: string;
}

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export function useMonthGate(): MonthGateResult {
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 1-12

  const { data: emptyWeeks, isLoading } = useEmptyWeeksInMonth(year, month);

  const hasCurrentMonthGap = (emptyWeeks?.length ?? 0) > 0;

  const isBlockedForDate = (dateStr: string): boolean => {
    if (!hasCurrentMonthGap) return false;
    // Parse YYYY-MM-DD
    const [yStr, mStr] = dateStr.split("-");
    const ty = Number(yStr);
    const tm = Number(mStr);
    if (!ty || !tm) return false;
    // Target after current month?
    return ty > year || (ty === year && tm > month);
  };

  return {
    ready: !isLoading,
    emptyWeeksInCurrentMonth: emptyWeeks ?? [],
    hasCurrentMonthGap,
    isBlockedForDate,
    currentMonthLabel: MONTH_NAMES[month - 1],
  };
}
