import type { Locale } from "@fitmusc/shared/locale";

const MESSAGE: Record<Locale, string> = {
  tr: "Yapay zeka özellikleri için verilerinin Anthropic'e gönderilmesine izin vermen gerekiyor (Ayarlar → Verilerim).",
  en: "AI features need your permission to send your data to Anthropic (Settings → My Data).",
};

/**
 * 403 for the web AI routes when checkRateLimit failed on the missing AI
 * consent (AI_CONSENT_REQUIRED) — null for any other error, which the route
 * keeps reporting as a rate limit.
 */
export function aiConsentDenied(err: unknown, locale: Locale, format: "text" | "json"): Response | null {
  if (!(err instanceof Error) || err.message !== "AI_CONSENT_REQUIRED") return null;
  return format === "json"
    ? Response.json({ error: MESSAGE[locale], code: "AI_CONSENT_REQUIRED" }, { status: 403 })
    : new Response(MESSAGE[locale], { status: 403 });
}
