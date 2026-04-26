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
