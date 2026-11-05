/**
 * Display-only currency layer for the pricing page. The *charged* currency is
 * fixed by the gateway — Lemon Squeezy bills in USD, iyzico in TRY — so these
 * figures are an approximate localized preview, never the amount collected.
 *
 * Rates are static and must be refreshed by hand periodically; the UI always
 * labels converted prices as approximate.
 */

export interface DisplayCurrency {
  code: string;
  symbol: string;
  // Multiply a USD amount by this to get the approximate local amount.
  rate: number;
  // BCP-47 tag for Intl.NumberFormat.
  locale: string;
}

export const DISPLAY_CURRENCIES: Record<string, DisplayCurrency> = {
  USD: { code: "USD", symbol: "$", rate: 1, locale: "en-US" },
  EUR: { code: "EUR", symbol: "€", rate: 0.92, locale: "de-DE" },
  GBP: { code: "GBP", symbol: "£", rate: 0.79, locale: "en-GB" },
  TRY: { code: "TRY", symbol: "₺", rate: 34, locale: "tr-TR" },
  CAD: { code: "CAD", symbol: "CA$", rate: 1.37, locale: "en-CA" },
  AUD: { code: "AUD", symbol: "A$", rate: 1.52, locale: "en-AU" },
};

// ISO-3166 alpha-2 country → display currency code. Unlisted countries fall
// back to USD.
const COUNTRY_CURRENCY: Record<string, string> = {
  TR: "TRY",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  // Eurozone
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  IE: "EUR",
  PT: "EUR",
  FI: "EUR",
  GR: "EUR",
  SK: "EUR",
  SI: "EUR",
  EE: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  CY: "EUR",
  MT: "EUR",
  HR: "EUR",
};

/** Turkey VAT (KDV) rate — iyzico prices are quoted VAT-inclusive. */
export const TR_VAT_RATE = 0.2;

/** Resolves the preview currency for a request country. Defaults to USD. */
export function currencyForCountry(country: string | null): DisplayCurrency {
  if (!country) return DISPLAY_CURRENCIES.USD;
  const code = COUNTRY_CURRENCY[country.toUpperCase()];
  return DISPLAY_CURRENCIES[code] ?? DISPLAY_CURRENCIES.USD;
}

/** Formats a USD amount in the given display currency. */
export function localizedPrice(
  usd: number,
  currency: DisplayCurrency,
): string {
  return new Intl.NumberFormat(currency.locale, {
    style: "currency",
    currency: currency.code,
    maximumFractionDigits: currency.code === "TRY" ? 0 : 2,
  }).format(usd * currency.rate);
}

/**
 * Splits a VAT-inclusive total (e.g. an iyzico TRY charge) into net + tax.
 * Returns string values ready for the numeric `invoices` columns.
 */
export function splitVatInclusive(
  total: number,
  rate = TR_VAT_RATE,
): { subtotal: string; tax: string } {
  const subtotal = total / (1 + rate);
  return {
    subtotal: subtotal.toFixed(2),
    tax: (total - subtotal).toFixed(2),
  };
}
