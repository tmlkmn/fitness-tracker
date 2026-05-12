import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns today's date string (YYYY-MM-DD) in Turkey timezone (UTC+3).
 *  Safe for both server (UTC) and client (local) contexts. */
export function getTurkeyTodayStr(): string {
  const nowUtc = new Date();
  const turkeyOffset = 3 * 60 * 60 * 1000;
  const turkeyNow = new Date(nowUtc.getTime() + turkeyOffset);
  return `${turkeyNow.getUTCFullYear()}-${String(turkeyNow.getUTCMonth() + 1).padStart(2, "0")}-${String(turkeyNow.getUTCDate()).padStart(2, "0")}`;
}

export function isPastDate(dateStr: string): boolean {
  const today = getTurkeyTodayStr();
  return dateStr < today;
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatDateStr(d);
}

/**
 * Returns the Monday (YYYY-MM-DD) of the week containing `dateStr`, computed
 * in Europe/Istanbul timezone so the result is server-TZ independent. Monday
 * is treated as the first day of the week (dow=0), Sunday last (dow=6).
 */
export function getMondayStr(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, mo - 1, d, 9, 0, 0));

  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(noonUtc);

  const DOW: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };
  const dow = DOW[weekdayShort];
  const mondayNoonUtc = new Date(noonUtc.getTime() - dow * 86_400_000);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(mondayNoonUtc);
}

const TR_MONTHS_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

export function formatTrShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${TR_MONTHS_SHORT[d.getMonth()]}`;
}

export function formatWeekRange(startDateStr: string): string {
  const endStr = addDaysStr(startDateStr, 6);
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endStr + "T00:00:00");
  const startTxt = `${start.getDate()} ${TR_MONTHS_SHORT[start.getMonth()]}`;
  const endTxt = `${end.getDate()} ${TR_MONTHS_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  return `${startTxt} – ${endTxt}`;
}

/** A week (starting Monday) is considered past once its Sunday end has passed. */
export function isWeekPast(startDateStr: string): boolean {
  const endStr = addDaysStr(startDateStr, 6);
  const today = getTurkeyTodayStr();
  return endStr < today;
}
