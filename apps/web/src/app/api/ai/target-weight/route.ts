import { requireApiUser } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/ai";
import { getUserLocale } from "@fitmusc/shared/locale";
import { suggestTargetWeight } from "@/lib/ai-target-weight";

export const maxDuration = 30;

const ERRORS: Record<string, [number, string]> = {
  NOT_FOUND: [400, "Kullanıcı bulunamadı."],
  NOT_ENOUGH_DATA: [400, "Hedef kilo önerisi için en az 1 ölçüm kaydı gerekli."],
  AI_EMPTY_RESPONSE: [500, "AI yanıtı işlenemedi. Lütfen tekrar deneyin."],
};

export async function POST() {
  const { user: sessionUser, response } = await requireApiUser();
  if (response) return response;

  const userId = sessionUser.id;
  const locale = getUserLocale(sessionUser);

  try {
    await checkRateLimit(userId, "target-weight");
  } catch (err) {
    const msg = err instanceof Error && err.message.startsWith("COOLDOWN:")
      ? `Lütfen ${err.message.split(":")[1]} saniye bekleyin.`
      : "Günlük hedef kilo önerisi limitine ulaştınız (max 2/gün).";
    return Response.json({ error: msg }, { status: 429 });
  }

  try {
    return Response.json(await suggestTargetWeight(userId, locale));
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const [status, error] = Object.hasOwn(ERRORS, message)
      ? ERRORS[message]
      : [500, "AI servisi şu anda kullanılamıyor."];
    return Response.json({ error }, { status });
  }
}
