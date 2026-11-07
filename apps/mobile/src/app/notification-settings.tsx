import { Stack } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { useTranslations } from "use-intl";

import { TimeField } from "@/components/form";
import { AppText, Card, ErrorView, LoadingView, Screen, Segmented, useErrorMessage } from "@/components/ui";
import { useEnsureTimezone, useNotificationPreferences, useUpdatePreferences, type PreferencesPatch } from "@/hooks/notifications";
import { colors, spacing } from "@/lib/theme";

const QUIET_START = "22:00";
const QUIET_END = "08:00";

/** Channels, quiet hours and the week start (web: NotificationPreferencesCard). */
export default function NotificationSettingsScreen() {
  const t = useTranslations("settings.notificationPrefs");
  const tm = useTranslations("mobile.notificationSettings");
  const errorMessage = useErrorMessage();
  const prefs = useNotificationPreferences();
  const update = useUpdatePreferences();
  useEnsureTimezone(prefs.data);

  if (prefs.isLoading) return <LoadingView />;
  if (!prefs.data) return <ErrorView error={prefs.error} onRetry={() => prefs.refetch()} />;
  const p = prefs.data;
  const save = (patch: PreferencesPatch) => update.mutate(patch);
  const quiet = Boolean(p.quietHoursStart && p.quietHoursEnd);

  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <Screen onRefresh={() => prefs.refetch()}>
        {update.error ? <AppText style={styles.error}>{errorMessage(update.error)}</AppText> : null}
        <Card>
          {/* Unsaved preferences count as on, like the server's dispatch. */}
          <SwitchRow label={t("inAppLabel")} value={p.inAppEnabled ?? true} onChange={(v) => save({ inAppEnabled: v })} />
          <SwitchRow label={t("emailLabel")} value={p.emailEnabled ?? true} onChange={(v) => save({ emailEnabled: v })} />
          <SwitchRow label={t("pushLabel")} value={p.pushEnabled ?? true} onChange={(v) => save({ pushEnabled: v })}>
            <AppText variant="small">{tm("pushHint")}</AppText>
          </SwitchRow>
        </Card>

        <Card>
          <SwitchRow
            label={`🌙 ${t("quietHoursLabel")}`}
            value={quiet}
            onChange={(v) =>
              save({
                quietHoursStart: v ? (p.quietHoursStart ?? QUIET_START) : null,
                quietHoursEnd: v ? (p.quietHoursEnd ?? QUIET_END) : null,
              })
            }
          />
          {quiet ? (
            <>
              <View style={styles.row}>
                <AppText variant="muted" style={styles.grow}>
                  {t("quietHoursStart")}
                </AppText>
                <TimeField
                  value={p.quietHoursStart ?? QUIET_START}
                  onChange={(time) => save({ quietHoursStart: time })}
                  accessibilityLabel={t("quietHoursStart")}
                />
              </View>
              <View style={styles.row}>
                <AppText variant="muted" style={styles.grow}>
                  {t("quietHoursEnd")}
                </AppText>
                <TimeField
                  value={p.quietHoursEnd ?? QUIET_END}
                  onChange={(time) => save({ quietHoursEnd: time })}
                  accessibilityLabel={t("quietHoursEnd")}
                />
              </View>
              <AppText variant="small">{t("quietHoursHint")}</AppText>
            </>
          ) : null}
        </Card>

        <Card>
          <AppText variant="small">{t("weekStartLabel")}</AppText>
          <Segmented
            options={[
              { value: "monday", label: t("weekStartMonday") },
              { value: "sunday", label: t("weekStartSunday") },
            ]}
            value={p.weekStartsOn === "sunday" ? "sunday" : "monday"}
            onChange={(weekStartsOn) => save({ weekStartsOn })}
          />
        </Card>
      </Screen>
    </>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.switchBlock}>
      <View style={styles.row}>
        <AppText style={styles.grow}>{label}</AppText>
        <Switch
          value={value}
          onValueChange={onChange}
          accessibilityLabel={label}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
  switchBlock: { gap: spacing.xs },
  error: { color: colors.danger, textAlign: "center" },
});
