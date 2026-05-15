import type { Locale } from "@/lib/locale";

export type Gateway = "lemonsqueezy" | "iyzico";

export interface GatewayContext {
  // Explicit ?gateway= query param — admin/testing override, wins outright.
  explicit?: string | null;
  userLocale?: Locale | null;
  // ISO-3166 alpha-2 country from the request IP.
  country?: string | null;
}

/**
 * Picks the payment gateway for a checkout.
 *
 * Priority: explicit override > IP country > user locale > Lemon Squeezy.
 * IP country dominates locale so a Turkey-resident pays TRY via iyzico even
 * with an English UI, while a Turkish-speaker abroad pays USD via Lemon
 * Squeezy. When the country is unknown, locale breaks the tie.
 */
export function pickGateway(ctx: GatewayContext): Gateway {
  if (ctx.explicit === "lemonsqueezy" || ctx.explicit === "iyzico") {
    return ctx.explicit;
  }
  const country = ctx.country?.toUpperCase();
  if (country === "TR") return "iyzico";
  if (country) return "lemonsqueezy";
  return ctx.userLocale === "tr" ? "iyzico" : "lemonsqueezy";
}

// Reads the request country from Vercel / Cloudflare edge headers.
export function countryFromHeaders(headers: Headers): string | null {
  return (
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    null
  );
}
