import Ionicons from "@expo/vector-icons/Ionicons";
import type { SleepLogDto } from "@fitmusc/shared/api/dto";
import { dateString } from "@fitmusc/shared/api/schemas";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { Field, Input, TimeField } from "@/components/form";
import { AppText, Button, Card, ErrorView, LoadingView, useErrorMessage } from "@/components/ui";
import { useSleepDuration } from "@/components/wellness";
import { useCloseGuard } from "@/hooks/close-guard";
import { useDeleteSleep, useSaveSleep, useSleep } from "@/hooks/wellness";
import { sleepMinutes } from "@/lib/dates";
import { colors, seriesColors, spacing } from "@/lib/theme";

export default function SleepScreen() {
  const t = useTranslations("sleep.form");
  const raw = useLocalSearchParams<{ date: string }>().date;
  const date = dateString.safeParse(raw).success ? raw : null;
  const sleep = useSleep(date ?? "");

  if (!date) return <ErrorView error={null} />;
  if (sleep.isLoading) return <LoadingView />;
  if (sleep.error) return <ErrorView error={sleep.error} onRetry={() => sleep.refetch()} />;

  return (
    <>
      <Stack.Screen options={{ title: sleep.data ? t("editTitle") : t("addTitle") }} />
      <SleepForm date={date} log={sleep.data ?? null} />
    </>
  );
}

function SleepForm({ date, log }: { date: string; log: SleepLogDto | null }) {
  const t = useTranslations();
  const tf = useTranslations("sleep.form");
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const duration = useSleepDuration();
  const save = useSaveSleep(date);
  const remove = useDeleteSleep(date);

  // Same defaults as the web form.
  const [bedtime, setBedtime] = useState(log?.bedtime ?? "23:00");
  const [wakeTime, setWakeTime] = useState(log?.wakeTime ?? "07:00");
  const [quality, setQuality] = useState(log?.quality ?? 3);
  const [notes, setNotes] = useState(log?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const dirty =
    bedtime !== (log?.bedtime ?? "23:00") ||
    wakeTime !== (log?.wakeTime ?? "07:00") ||
    quality !== (log?.quality ?? 3) ||
    notes !== (log?.notes ?? "");
  const { leave } = useCloseGuard(dirty && !save.isPending && !remove.isPending);

  const done = { onSuccess: leave, onError: (err: unknown) => setError(errorMessage(err)) };
  const submit = () => {
    setError(null);
    save.mutate({ logDate: date, bedtime, wakeTime, quality, notes: notes.trim() || null }, done);
  };
  const confirmDelete = () => {
    if (!log) return;
    Alert.alert(t("mobile.sleep.deleteTitle"), t("mobile.sleep.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => remove.mutate(log.id, done) },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <AppText variant="muted">{formatDate(parseDateOnly(date), locale, { weekday: "long", day: "numeric", month: "long" })}</AppText>
      <Card>
        <View style={styles.timeRow}>
          <Field label={tf("bedtimeLabel")}>
            <TimeField value={bedtime} onChange={setBedtime} accessibilityLabel={tf("bedtimeLabel")} />
          </Field>
          <Field label={tf("wakeTimeLabel")}>
            <TimeField value={wakeTime} onChange={setWakeTime} accessibilityLabel={tf("wakeTimeLabel")} />
          </Field>
        </View>
        <AppText style={styles.duration}>
          {duration(sleepMinutes(bedtime, wakeTime))} <AppText variant="small">{tf("durationSuffix")}</AppText>
        </AppText>
      </Card>

      <Card>
        <AppText variant="small">{tf("qualityLabel")}</AppText>
        <View style={styles.moons} accessibilityRole="radiogroup" accessibilityLabel={tf("qualityLabel")}>
          {[1, 2, 3, 4, 5].map((v) => (
            <Pressable
              key={v}
              accessibilityRole="radio"
              accessibilityState={{ checked: v === quality }}
              accessibilityLabel={`${v}/5`}
              hitSlop={6}
              onPress={() => setQuality(v)}
            >
              <Ionicons name={v <= quality ? "moon" : "moon-outline"} size={32} color={v <= quality ? seriesColors.sleep : colors.border} />
            </Pressable>
          ))}
          <AppText variant="muted">{t("sleep.chart.qualityValue", { value: quality })}</AppText>
        </View>
      </Card>

      <Card>
        <Field label={tf("notesLabel")}>
          <Input value={notes} onChangeText={setNotes} placeholder={tf("notesPlaceholder")} multiline maxLength={500} />
        </Field>
      </Card>

      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      <Button label={tf("save")} loading={save.isPending} onPress={submit} />
      {log ? <Button label={t("common.delete")} variant="danger" loading={remove.isPending} onPress={confirmDelete} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  timeRow: { flexDirection: "row", gap: spacing.lg },
  duration: { fontSize: 17, fontWeight: "600", textAlign: "center" },
  moons: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  error: { color: colors.danger, textAlign: "center" },
});
