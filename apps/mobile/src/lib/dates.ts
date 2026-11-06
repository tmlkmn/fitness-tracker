import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import type { WeekStart } from "@fitmusc/shared/week";

// Calendar-date arithmetic on `YYYY-MM-DD` strings. Done in UTC so the result
// never depends on the phone's time zone or a DST switch; "today" itself is
// the program's zone (Europe/Istanbul), like the server.

/** Today's calendar date in the program's zone, `YYYY-MM-DD` (what the server calls "today"). */
export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

function toUtc(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const fromUtc = (date: Date) => date.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** A plan week's dates from its start: "3–9 Kas", or "28 Eki – 3 Kas" across months. */
export function weekRangeLabel(start: string, locale: Locale): string {
  const end = addDays(start, 6);
  const month = (d: string) => formatDate(parseDateOnly(d), locale, { month: "short" });
  const startDay = Number(start.slice(8));
  const endDay = Number(end.slice(8));
  return month(start) === month(end) ? `${startDay}–${endDay} ${month(start)}` : `${startDay} ${month(start)} – ${endDay} ${month(end)}`;
}

/** A plan week is past once its last day is (web: isWeekPast — such weeks can't be shared). */
export const isWeekPast = (start: string) => addDays(start, 6) < todayStr();

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (date: string) => toUtc(date).getUTCDay();

export function weekStartOf(date: string, startsOn: WeekStart): string {
  const day = weekday(date);
  const back = startsOn === "sunday" ? day : (day + 6) % 7;
  return addDays(date, -back);
}

/** The 7 dates of the week containing `date`. */
export function weekDates(date: string, startsOn: WeekStart): string[] {
  const start = weekStartOf(date, startsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const monthOf = (date: string) => ({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) });

export function shiftMonth(year: number, month: number, by: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Rows of 7 dates covering the month; days outside it are null. */
export function monthGrid(year: number, month: number, startsOn: WeekStart): (string | null)[][] {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (weekday(first) - (startsOn === "sunday" ? 0 : 1) + 7) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 0; i < daysInMonth; i++) cells.push(addDays(first, i));
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));
}

/** Minutes between bedtime and wake time (`HH:MM`), across midnight. Mirrors the server's calculation. */
export function sleepMinutes(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let bed = bh * 60 + bm;
  const wake = wh * 60 + wm;
  if (bed >= wake) bed -= 24 * 60;
  return wake - bed;
}

export const toTimeString = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

/** A local Date at `HH:MM` today — the value a time picker edits. */
export function fromTimeString(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Local-midnight Date of a `YYYY-MM-DD` — the value a date picker edits. */
export function fromDateString(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
