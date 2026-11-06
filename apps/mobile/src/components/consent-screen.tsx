import { hasAiConsent, hasDataConsent } from "@fitmusc/shared/consent";
import type { Locale } from "@fitmusc/shared/locale";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale, useTranslations } from "use-intl";

import { AppText, Button, Card } from "@/components/ui";
import { useConsents, useSetConsents } from "@/hooks/ai-consent";
import { useSession } from "@/lib/session";
import { colors, spacing } from "@/lib/theme";
import { openWebPage } from "@/lib/web-links";

/**
 * KVKK explicit consent — shown in place of the app while the server answers
 * 403 ConsentRequired (same texts and record as the web's /acik-riza page).
 * Health data + hosting abroad are required, the AI transfer is optional.
 * Someone who won't consent can delete their account or sign out from here.
 */
export function ConsentScreen() {
  const t = useTranslations("consent");
  const tAll = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { retryAccess, signOut } = useSession();
  const consents = useConsents();
  const save = useSetConsents();
  const [health, setHealth] = useState(false);
  const [abroad, setAbroad] = useState(false);
  const [ai, setAi] = useState<boolean | null>(null);
  const [error, setError] = useState(false);

  // The persisted copy may be old; read the record fresh on open.
  const { refetch } = consents;
  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Already given (e.g. on the web) — nothing to ask, re-check access.
  const alreadyGiven = hasDataConsent(consents.data?.dataConsentAt);
  useEffect(() => {
    if (alreadyGiven) retryAccess();
  }, [alreadyGiven, retryAccess]);

  // Until touched, the AI switch mirrors a consent the user already gave.
  const aiOn = ai ?? hasAiConsent(consents.data?.aiConsentAt);

  const submit = () => {
    setError(false);
    save.mutate({ data: true, ai: aiOn }, { onSuccess: () => retryAccess(), onError: () => setError(true) });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
    >
      <AppText variant="title">{t("title")}</AppText>
      <AppText variant="muted">{t("intro")}</AppText>
      <View style={styles.links}>
        <Button label={t("kvkkLink")} variant="ghost" onPress={() => void openWebPage("kvkk", locale)} />
        <Button label={t("privacyLink")} variant="ghost" onPress={() => void openWebPage("privacy", locale)} />
      </View>

      <Card>
        <ConsentSwitch label={t("healthLabel")} value={health} onChange={setHealth} />
        <ConsentSwitch label={t("abroadLabel")} value={abroad} onChange={setAbroad} />
        <ConsentSwitch label={t("aiLabel")} hint={t("aiHint")} value={aiOn} onChange={setAi} />
      </Card>

      <AppText variant="small">{t("required")}</AppText>
      {error ? <AppText style={styles.error}>{t("error")}</AppText> : null}
      <Button label={t("submit")} disabled={!health || !abroad} loading={save.isPending} onPress={submit} />

      <Card>
        <AppText style={styles.bold}>{t("declineTitle")}</AppText>
        <AppText variant="muted">{t("declineBody")}</AppText>
        <Button label={tAll("account.delete.title")} variant="danger" onPress={() => router.push("/delete-account")} />
        <Button label={tAll("nav.signOut")} variant="secondary" onPress={() => void signOut()} />
      </Card>
    </ScrollView>
  );
}

function ConsentSwitch({
  label,
  hint,
  value,
  onChange,
}: Readonly<{ label: string; hint?: string; value: boolean; onChange: (value: boolean) => void }>) {
  return (
    <View style={styles.row}>
      <View style={styles.grow}>
        <AppText>{label}</AppText>
        {hint ? <AppText variant="small">{hint}</AppText> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  links: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, gap: spacing.xs },
  bold: { fontWeight: "600" },
  error: { color: colors.danger },
});
