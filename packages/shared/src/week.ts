export type WeekStart = "monday" | "sunday";

const LABELS_MONDAY = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const LABELS_SUNDAY = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export function getWeekDayLabels(startsOn: WeekStart = "monday"): string[] {
  return startsOn === "sunday" ? LABELS_SUNDAY : LABELS_MONDAY;
}

export function getWeekStartDate(date: Date, startsOn: WeekStart = "monday"): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff =
    startsOn === "sunday"
      ? -day
      : day === 0
        ? -6
        : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── AI weekly plan week ──────────────────────────────────────────────────────
// The weekly plan is Monday-based on the server (applyWeeklyPlan →
// getMondayStr; dayOfWeek 0 = Monday) whatever the user's display week start
// is. Calendar-date math on YYYY-MM-DD strings in UTC, so the phone's or the
// server's zone never shifts a day.

const DAY_MS = 86_400_000;

function utcDay(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Monday (YYYY-MM-DD) of the Monday-based week containing `date`. */
export function mondayOf(date: string): string {
  const t = utcDay(date);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // 0 = Monday
  return new Date(t - dow * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Days of `date`'s Monday-based week that are already behind `today`
 * (0 = Monday): never generated, never overwritten by an AI weekly plan.
 * Empty for a future week, all seven for a past one.
 */
export function pastDowsOfWeek(date: string, today: string): number[] {
  const elapsed = Math.round((utcDay(today) - utcDay(mondayOf(date))) / DAY_MS);
  return Array.from({ length: Math.max(0, Math.min(elapsed, 7)) }, (_, i) => i);
}
