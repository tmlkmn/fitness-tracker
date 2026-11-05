// Single source of the supported locales — next-intl's routing config
// (apps/web/src/i18n/routing.ts) and the mobile app both read these.
export const SUPPORTED_LOCALES = ["tr", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "tr";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Extracts the locale from a better-auth user object. better-auth attaches the
 * additional `locale` field to the session user as an arbitrary string, so we
 * normalize to a supported `Locale`.
 */
export function getUserLocale(user: { locale?: string | null } | null | undefined): Locale {
  return normalizeLocale(user?.locale);
}
