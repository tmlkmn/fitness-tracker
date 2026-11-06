import type { Locale } from "@fitmusc/shared/locale";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Alert } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { aiConsentOf, loadAiConsent, setAiConsent, subscribeAiConsent } from "@/lib/ai-consent";
import { useSession } from "@/lib/session";
import { openWebPage } from "@/lib/web-links";

/** Whether the signed-in user allowed sending their data to the AI provider (undefined while loading). */
export function useAiConsent() {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const granted = useSyncExternalStore(subscribeAiConsent, () => (userId ? aiConsentOf(userId) : undefined));
  useEffect(() => {
    if (userId) loadAiConsent(userId);
  }, [userId]);
  const set = useCallback((value: boolean) => (userId ? setAiConsent(userId, value) : Promise.resolve()), [userId]);
  return { granted, set };
}

/**
 * Runs an AI action once the user has allowed sharing their data with the AI
 * provider; asks first (explaining what is sent) when they haven't.
 */
export function useRequireAiConsent() {
  const t = useTranslations("mobile.aiConsent");
  const locale = useLocale() as Locale;
  const { granted, set } = useAiConsent();
  return (action: () => void) => {
    if (granted) return action();
    Alert.alert(t("title"), t("body"), [
      { text: t("privacy"), onPress: () => void openWebPage("privacy", locale) },
      { text: t("decline"), style: "cancel" },
      {
        text: t("allow"),
        onPress: () => {
          void set(true);
          action();
        },
      },
    ]);
  };
}
