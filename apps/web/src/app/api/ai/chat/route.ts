import { requireApiUser } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/ai";
import { aiConsentDenied } from "@/lib/ai-consent-response";
import { getUserLocale } from "@fitmusc/shared/locale";
import { streamCoachReply } from "@/lib/ai-coach-chat";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const userId = user.id;
  const locale = getUserLocale(user);

  try {
    await checkRateLimit(userId, "chat");
  } catch (err) {
    const consentDenied = aiConsentDenied(err, locale, "text");
    if (consentDenied) return consentDenied;
    const msg = err instanceof Error && err.message.startsWith("COOLDOWN:")
      ? (locale === "en"
          ? `Please wait ${err.message.split(":")[1]} seconds before sending again.`
          : `Lütfen ${err.message.split(":")[1]} saniye bekleyin.`)
      : (locale === "en"
          ? "Daily chat limit reached (max 15/day)."
          : "Günlük sohbet limitine ulaştınız (max 15/gün).");
    return new Response(msg, { status: 429 });
  }

  const body = await request.json();
  const rawMessages = body.messages;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return new Response(locale === "en" ? "Message required." : "Mesaj gerekli.", { status: 400 });
  }

  // Validate & sanitize messages
  const userMessages = rawMessages
    .filter(
      (m: unknown): m is { role: string; content: string } =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as Record<string, unknown>).role === "string" &&
        typeof (m as Record<string, unknown>).content === "string",
    )
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content.slice(0, 5000),
    }));

  if (userMessages.length === 0) {
    return new Response(locale === "en" ? "Message required." : "Mesaj gerekli.", { status: 400 });
  }

  return streamCoachReply(userId, locale, userMessages, { persistReply: false });
}
