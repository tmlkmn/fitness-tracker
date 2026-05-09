import { routing, type Locale } from "@/i18n/routing";

export type { Locale };

export const SUPPORTED_LOCALES = routing.locales;
export const DEFAULT_LOCALE: Locale = routing.defaultLocale;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
