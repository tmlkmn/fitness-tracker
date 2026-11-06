import { mondayOf, pastDowsOfWeek } from "@fitmusc/shared/week";

import { addDays, monthOf, shiftMonth, todayStr, weekday } from "./dates";

// The AI weekly plan is Monday-based on the server (applyWeeklyPlan →
// getMondayStr; dayOfWeek 0 = Monday), whatever the user's week start is.
// Everything here follows the server, not the calendar's display week; the
// week math itself is shared with the web and the server (@fitmusc/shared/week).

export interface AiWeek {
  monday: string;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  /** Days of the current week already behind us (0 = Monday) — never generated or overwritten. */
  pastDows: number[];
}

export function aiWeekOf(date: string, today = todayStr()): AiWeek {
  const monday = mondayOf(date);
  const sunday = addDays(monday, 6);
  return {
    monday,
    isPast: sunday < today,
    isCurrent: monday <= today && today <= sunday,
    isFuture: monday > today,
    pastDows: pastDowsOfWeek(date, today),
  };
}

/** Mon–Fri — the web hides "change this week" on weekends (too late to re-plan it). */
export const isWeekdayToday = (today = todayStr()) => {
  const day = weekday(today);
  return day >= 1 && day <= 5;
};

/** Every month a Monday in [from, to) falls in — the empty-weeks endpoint answers per month. */
export function monthsOfMondays(from: string, to: string): { year: number; month: number }[] {
  const months: { year: number; month: number }[] = [];
  for (let monday = from; monday < to; monday = addDays(monday, 7)) {
    const m = monthOf(monday);
    if (!months.some((x) => x.year === m.year && x.month === m.month)) months.push(m);
  }
  return months;
}

export const nextMonth = (date: string) => {
  const { year, month } = monthOf(date);
  return shiftMonth(year, month, 1);
};

export type DayChoice = "workout" | "swimming" | "rest";

/** Workout → swimming → rest (swimming skipped for nutrition-only users), like the web picker. */
export function cycleDayChoice(current: DayChoice, allowSwimming: boolean): DayChoice {
  if (current === "workout") return allowSwimming ? "swimming" : "rest";
  if (current === "swimming") return "rest";
  return "workout";
}
