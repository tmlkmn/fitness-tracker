import { requireApiUser } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/ai";
import { aiConsentDenied } from "@/lib/ai-consent-response";
import { getUserLocale } from "@fitmusc/shared/locale";
import { streamProgressAnalysis } from "@/lib/ai-progress-analysis";

export const maxDuration = 60;

export async function POST() {
  const { user: sessionUser, response } = await requireApiUser();
  if (response) return response;

  const userId = sessionUser.id;
  const locale = getUserLocale(sessionUser);

  try {
    await checkRateLimit(userId, "analyze");
  } catch (err) {
    const consentDenied = aiConsentDenied(err, locale, "text");
    if (consentDenied) return consentDenied;
    const msg = err instanceof Error && err.message.startsWith("COOLDOWN:")
      ? (locale === "en"
          ? `Please wait ${err.message.split(":")[1]} seconds before retrying.`
          : `Lütfen ${err.message.split(":")[1]} saniye bekleyin.`)
      : (locale === "en"
          ? "Daily analysis limit reached (max 3/day)."
          : "Günlük analiz limitine ulaştınız (max 3/gün).");
    return new Response(msg, { status: 429 });
  }

  const analysis = await streamProgressAnalysis(userId, locale);
  if (!analysis) {
    return new Response(
      locale === "en" ? "Not enough data yet." : "Henüz yeterli veri yok.",
      { status: 200 },
    );
  }
  return analysis;
}
