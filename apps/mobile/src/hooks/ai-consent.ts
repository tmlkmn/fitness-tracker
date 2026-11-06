import type { ConsentsDto } from "@fitmusc/shared/api/dto";
import { hasAiConsent } from "@fitmusc/shared/consent";
import type { Locale } from "@fitmusc/shared/locale";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Alert } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { openWebPage } from "@/lib/web-links";

// KVKK consents live on the server (users.data_consent_at / ai_consent_at),
// shared with the web app; the server refuses AI calls without the AI one
// (403 AI_CONSENT_REQUIRED) and everything else without the data one
// (403 ConsentRequired → the blocked screen asks for it).

export const CONSENTS_KEY = ["me.consents"] as const;

export function useConsents() {
  const { user } = useSession();
  return useQuery({
    queryKey: CONSENTS_KEY,
    queryFn: () => api<ConsentsDto>("/me/consents"),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}

export function useSetConsents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (change: { data?: boolean; ai?: boolean }) =>
      api<ConsentsDto>("/me/consents", { method: "PUT", body: change }),
    onSuccess: (consents) => {
      queryClient.setQueryData(CONSENTS_KEY, consents);
      // The greeting is a plain text without the AI consent.
      void queryClient.invalidateQueries({ queryKey: ["ai.greeting"] });
    },
  });
}

/** Whether the signed-in user allowed sending their data to the AI provider (undefined while loading). */
export function useAiConsent() {
  const consents = useConsents();
  const save = useSetConsents();
  const granted = consents.data ? hasAiConsent(consents.data.aiConsentAt) : undefined;
  const { mutateAsync } = save;
  const set = useCallback((value: boolean) => mutateAsync({ ai: value }), [mutateAsync]);
  return { granted, set, saving: save.isPending };
}

/**
 * Runs an AI action once the user has allowed sharing their data with the AI
 * provider; asks first (explaining what is sent) when they haven't. The
 * consent is saved on the server before the action runs — the server checks it.
 */
export function useRequireAiConsent() {
  const t = useTranslations("mobile.aiConsent");
  const tErrors = useTranslations("mobile.errors");
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
          set(true).then(action, () => Alert.alert(tErrors("generic")));
        },
      },
    ]);
  };
}
