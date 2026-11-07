import Ionicons from "@expo/vector-icons/Ionicons";
import type { Locale } from "@fitmusc/shared/locale";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { ProfileSummaryCard, SettingsGroup, SettingsRow } from "@/components/settings-list";
import { AppText, Button, Screen, useErrorMessage } from "@/components/ui";
import { useAiConsent, useSetConsents } from "@/hooks/ai-consent";
import { usePushRegistration } from "@/hooks/push";
import { useProfile } from "@/hooks/wellness";
import { todayStr } from "@/lib/dates";
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
  const { user, setLocale, signOut, reportDenial } = useSession();
  const profile = useProfile();
  const push = usePushRegistration();
  const aiConsent = useAiConsent();
  const consents = useSetConsents();
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

  const setAi = (value: boolean) => {
    aiConsent.set(value).catch(() => Alert.alert(t("consent.settings.error")));
  };

  // Without the data consent the app can't run: the consent screen takes over.
  const withdrawDataConsent = () =>
    Alert.alert(t("consent.settings.dataWithdrawTitle"), t("consent.settings.dataWithdrawBody"), [
      { text: t("consent.settings.cancel"), style: "cancel" },
      {
        text: t("consent.settings.dataWithdraw"),
        style: "destructive",
        onPress: () =>
          consents.mutate(
            { data: false },
            {
              onSuccess: () => reportDenial("ConsentRequired"),
              onError: () => Alert.alert(t("consent.settings.error")),
            },
          ),
      },
    ]);

  const pushResult = push.data;
  const pushRegistered = pushResult?.status === "registered";
  const pushKey = pushResult
    ? PUSH_TEXT[pushResult.status === "unavailable" ? pushResult.reason : pushResult.status]
    : null;

  return (
    <Screen refreshing={profile.isRefetching} onRefresh={() => profile.refetch()}>
      <ProfileSummaryCard name={user?.name} email={user?.email} profile={profile.data} today={todayStr()} />

      <SettingsGroup label={t("settings.groups.goals")}>
        <SettingsRow
          icon="pie-chart-outline"
          title={t("settings.items.macroTitle")}
          subtitle={t("settings.items.macroSubtitle")}
          onPress={() => router.push("/macro-targets")}
        />
        <SettingsRow icon="flag-outline" title={t("progress.weightTarget.title")} onPress={() => router.push("/weight-targets")} />
      </SettingsGroup>

      <SettingsGroup label={t("settings.groups.app")}>
        <SettingsRow
          icon="notifications-outline"
          title={t("settings.items.notificationsTitle")}
          subtitle={t("settings.items.notificationsSubtitle")}
          onPress={() => router.push("/notification-settings")}
        />
        <SettingsRow
          icon="alarm-outline"
          title={t("settings.items.remindersTitle")}
          subtitle={t("settings.items.remindersSubtitle")}
          onPress={() => router.push("/reminders")}
        />
        <SettingsRow
          icon="phone-portrait-outline"
          title={t("mobile.settings.notifications")}
          subtitle={pushKey ? t(`mobile.settings.${pushKey}`) : t("common.loading")}
          tone={pushResult && !pushRegistered ? "warning" : "default"}
          onPress={pushResult && !pushRegistered ? () => push.refetch() : undefined}
          trailing={
            push.isFetching ? (
              <ActivityIndicator color={colors.primary} />
            ) : pushRegistered ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            ) : undefined
          }
        />
        <SettingsRow
          icon="language-outline"
          title={t("mobile.settings.language")}
          subtitle={localeError ?? undefined}
          trailing={
            <View style={styles.segment} accessibilityRole="radiogroup">
              {(["tr", "en"] as const).map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityLabel={t(option === "tr" ? "nav.languageTurkish" : "nav.languageEnglish")}
                  accessibilityState={{ checked: locale === option, busy: changing === option }}
                  onPress={() => chooseLocale(option)}
                  style={[styles.segmentItem, locale === option && styles.segmentActive]}
                >
                  <AppText style={locale === option ? styles.segmentLabelActive : styles.segmentLabel}>{option.toUpperCase()}</AppText>
                </Pressable>
              ))}
            </View>
          }
        />
        <SettingsRow icon="globe-outline" title={t("mobile.settings.openWebApp")} external onPress={() => openWebPage("home", locale)} />
      </SettingsGroup>

      <SettingsGroup label={t("settings.groups.sharingData")}>
        <SettingsRow
          icon="share-social-outline"
          title={t("settings.items.sharingTitle")}
          subtitle={t("settings.items.sharingSubtitle")}
          onPress={() => router.push("/sharing")}
        />
        <SettingsRow
          icon="sparkles-outline"
          title={t("mobile.aiConsent.settingsTitle")}
          subtitle={t(aiConsent.granted ? "mobile.aiConsent.granted" : "mobile.aiConsent.notGranted")}
          trailing={
            <Switch
              accessibilityLabel={t("mobile.aiConsent.settingsTitle")}
              value={aiConsent.granted}
              disabled={aiConsent.saving}
              onValueChange={setAi}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup label={t("mobile.settings.privacyAccount")}>
        <SettingsRow icon="shield-checkmark-outline" title={t("cookieConsent.privacyLink")} external onPress={() => openWebPage("privacy", locale)} />
        <SettingsRow icon="document-text-outline" title={t("footer.links.terms")} external onPress={() => openWebPage("terms", locale)} />
        <SettingsRow icon="reader-outline" title={t("consent.kvkkLink")} external onPress={() => openWebPage("kvkk", locale)} />
        {user?.role === "admin" ? null : (
          <SettingsRow
            icon="hand-left-outline"
            title={t("consent.settings.dataWithdraw")}
            tone="warning"
            disabled={consents.isPending}
            onPress={withdrawDataConsent}
          />
        )}
        <SettingsRow icon="trash-outline" title={t("account.delete.title")} tone="danger" onPress={() => router.push("/delete-account")} />
      </SettingsGroup>

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
  segment: { flexDirection: "row", gap: 2, backgroundColor: colors.background, borderRadius: radius.sm, padding: 2 },
  segmentItem: { minWidth: 40, alignItems: "center", paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm - 2 },
  segmentActive: { backgroundColor: colors.primary },
  segmentLabel: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  segmentLabelActive: { color: colors.primaryText, fontWeight: "700", fontSize: 13 },
  version: { textAlign: "center" },
});
