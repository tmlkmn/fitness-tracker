import { useTranslations } from "next-intl";
import { getNextQuotaReset } from "@/lib/quota-reset";

/**
 * Turns an AI action error into a localized message. The codes arrive in the
 * browser only when the action was called through `callAction`
 * (src/lib/safe-action.ts); anything else reads as the generic text.
 */
export function useAiErrorMessage(): (err: unknown) => string {
  const t = useTranslations("aiErrors");

  const wait = (totalSeconds: number) => {
    if (totalSeconds < 60) return t("duration.seconds", { s: totalSeconds });
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return s === 0 ? t("duration.minutes", { m }) : t("duration.minutesSeconds", { m, s });
  };

  const untilReset = () => {
    const minutesLeft = Math.floor((getNextQuotaReset().getTime() - Date.now()) / 60_000);
    if (minutesLeft <= 0) return t("duration.soon");
    const h = Math.floor(minutesLeft / 60);
    const m = minutesLeft % 60;
    if (h === 0) return t("duration.minutes", { m });
    return m === 0 ? t("duration.hours", { h }) : t("duration.hoursMinutes", { h, m });
  };

  return (err: unknown) => {
    const msg = err instanceof Error ? err.message : "";
    const seconds = (prefix: string) => {
      const n = Number.parseInt(msg.slice(prefix.length), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    };

    // checkRateLimit (src/lib/ai.ts): the daily quota, without a number.
    if (msg === "RATE_LIMITED") return t("quotaReached", { countdown: untilReset() });
    // rateLimit (src/lib/rate-limit.ts): a short burst limit with seconds.
    if (msg.startsWith("RATE_LIMITED:")) {
      const n = seconds("RATE_LIMITED:");
      return n ? t("tooMany", { wait: wait(n) }) : t("tooManyNoTime");
    }
    if (msg.startsWith("COOLDOWN:")) {
      const n = seconds("COOLDOWN:");
      return n ? t("cooldown", { wait: wait(n) }) : t("cooldownNoTime");
    }
    if (msg === "AI_UNAVAILABLE" || msg === "AI_EMPTY_RESPONSE") return t("unavailable");
    if (msg === "AI_CONSENT_REQUIRED") return t("consentRequired");
    return t("generic");
  };
}
