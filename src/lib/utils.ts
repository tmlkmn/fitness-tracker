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
