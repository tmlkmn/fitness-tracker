import type { Locale } from "@/lib/locale";

// Maps our app locale to the BCP-47 tag accepted by Intl APIs.
export function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "tr-TR";
}

export function formatDate(
  input: Date | string | number | null | undefined,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (input == null) return "";
  const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(intlLocale(locale), options);
}

export function formatTime(
  input: Date | string | number | null | undefined,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (input == null) return "";
  const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(intlLocale(locale), options);
}

// "YYYY-MM-DD" → midnight-local Date that toLocaleDateString can format
// without timezone shift.
export function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}
