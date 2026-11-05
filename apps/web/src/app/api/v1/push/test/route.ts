import type { PushTestResultDto } from "@fitmusc/shared/api/dto";
import { getUserLocale } from "@fitmusc/shared/locale";
import { apiRoute } from "@/lib/api/handler";
import { getExpoPushTokens, sendExpoPush } from "@/lib/expo-push";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Sends a test push to this account's own devices, bypassing preferences and
 * quiet hours (and writing no in-app notification) — for checking a device.
 */
export const POST = apiRoute(
  { auth: { requireActiveBilling: false } },
  async ({ user }): Promise<PushTestResultDto> => {
    checkRateLimit(`push-test:${user.id}`, 5, 10 * 60_000);
    const tokens = await getExpoPushTokens(user.id);
    const en = getUserLocale(user) === "en";
    await sendExpoPush(tokens, {
      title: en ? "Test notification" : "Test bildirimi",
      body: en ? "This device receives FitMusc notifications." : "Bu cihaz FitMusc bildirimlerini alıyor.",
      tag: "test",
    });
    return { devices: tokens.length };
  },
);
