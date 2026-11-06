import type { Locale } from "@fitmusc/shared/locale";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AppText, Button, Card, Screen, useErrorMessage } from "@/components/ui";
import { usePushRegistration } from "@/hooks/push";
import type { PushRegistration } from "@/lib/push";
import { useSession } from "@/lib/session";
import { colors, radius, spacing } from "@/lib/theme";
import { openWebPage } from "@/lib/web-links";

type PushOutcome = Exclude<PushRegistration["status"], "unavailable"> | Extract<PushRegistration, { status: "unavailable" }>["reason"];

// Push registration outcome → its text in mobile.settings.
const PUSH_TEXT: Record<PushOutcome, string> = {
  registered: "pushRegistered",
  denied: "pushDenied",
  "expo-go-android": "pushExpoGoAndroid",
  "no-project-id": "pushNoProjectId",
  simulator: "pushSimulator",
  error: "pushError",
};

export default function SettingsScreen() {
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const { user, setLocale, signOut } = useSession();
  const push = usePushRegistration();
  const [localeError, setLocaleError] = useState<string | null>(null);
  const [changing, setChanging] = useState<Locale | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const chooseLocale = async (next: Locale) => {
    if (next === locale || changing) return;
    setLocaleError(null);
    setChanging(next);
    try {
      await setLocale(next);
    } catch (err) {
      setLocaleError(errorMessage(err));
    } finally {
      setChanging(null);
    }
  };

  const pushResult = push.data;
  const pushKey = pushResult
    ? PUSH_TEXT[pushResult.status === "unavailable" ? pushResult.reason : pushResult.status]
    : null;

  return (
    <Screen>
      <Card>
        <AppText variant="small">{t("mobile.settings.account")}</AppText>
        <AppText variant="heading">{user?.name}</AppText>
        <AppText variant="muted">{user?.email}</AppText>
      </Card>

      <Card>
        <AppText variant="small">{t("mobile.settings.language")}</AppText>
        <View style={styles.segment} accessibilityRole="radiogroup">
          {(["tr", "en"] as const).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: locale === option, busy: changing === option }}
              onPress={() => chooseLocale(option)}
              style={[styles.segmentItem, locale === option && styles.segmentActive]}
            >
              <AppText style={locale === option ? styles.segmentLabelActive : styles.segmentLabel}>
                {t(option === "tr" ? "nav.languageTurkish" : "nav.languageEnglish")}
              </AppText>
            </Pressable>
          ))}
        </View>
        {localeError ? <AppText style={{ color: colors.danger }}>{localeError}</AppText> : null}
      </Card>

      <Card>
        <AppText variant="small">{t("mobile.settings.notifications")}</AppText>
        <AppText variant="muted">{pushKey ? t(`mobile.settings.${pushKey}`) : t("common.loading")}</AppText>
        {pushResult && pushResult.status !== "registered" ? (
          <Button
            label={t("mobile.settings.pushEnable")}
            variant="secondary"
            loading={push.isFetching}
            onPress={() => push.refetch()}
          />
        ) : null}
        <Button label={t("settings.notificationPrefs.title")} variant="secondary" onPress={() => router.push("/notification-settings")} />
        <Button label={t("settings.remindersCard.title")} variant="secondary" onPress={() => router.push("/reminders")} />
      </Card>

      <Card>
        <AppText variant="small">{t("mobile.sharing.title")}</AppText>
        <AppText variant="muted">{t("sharing.subtitle")}</AppText>
        <Button label={t("mobile.sharing.title")} variant="secondary" onPress={() => router.push("/sharing")} />
      </Card>

      <Card>
        <AppText variant="small">{t("settings.subpages.macroTitle")}</AppText>
        <AppText variant="muted">{t("meals.aiMacro.title")}</AppText>
        <Button label={t("settings.subpages.macroTitle")} variant="secondary" onPress={() => router.push("/macro-targets")} />
      </Card>

      <Button label={t("mobile.settings.openWebApp")} variant="secondary" onPress={() => openWebPage("home", locale)} />
      <Button
        label={t("nav.signOut")}
        variant="danger"
        loading={signingOut}
        onPress={async () => {
          setSigningOut(true);
          await signOut();
        }}
      />

      <AppText variant="small" style={styles.version}>
        {t("mobile.settings.version", { version: Constants.expoConfig?.version ?? "?" })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: "row", gap: spacing.xs, backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.xs },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.primary },
  segmentLabel: { color: colors.textMuted, fontWeight: "500" },
  segmentLabelActive: { color: colors.primaryText, fontWeight: "600" },
  version: { textAlign: "center" },
});
