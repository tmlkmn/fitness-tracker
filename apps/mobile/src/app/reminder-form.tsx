import type { ReminderDto } from "@fitmusc/shared/api/dto";
import { reminderCreateSchema, reminderUpdateSchema } from "@fitmusc/shared/api/schemas";
import { REMINDER_TEMPLATES, type ReminderTemplate } from "@fitmusc/shared/reminder-templates";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useTranslations } from "use-intl";

import { DateField, Field, Input, TimeField } from "@/components/form";
import { AppText, Button, Card, Chip, ErrorView, LoadingView, useErrorMessage } from "@/components/ui";
import { useCloseGuard } from "@/hooks/close-guard";
import { useCreateReminder, useDeleteReminder, useReminders, useUpdateReminder } from "@/hooks/reminders";
import { todayStr } from "@/lib/dates";
import { colors, spacing } from "@/lib/theme";

const RECURRENCES = ["daily", "weekdays", "weekends", "interval", "once", "custom"] as const;
type Recurrence = (typeof RECURRENCES)[number];
const RECURRENCE_LABEL = {
  daily: "recurrenceDaily",
  weekdays: "recurrenceWeekdays",
  weekends: "recurrenceWeekends",
  interval: "recurrenceInterval",
  once: "recurrenceOnce",
  custom: "recurrenceCustom",
} as const satisfies Record<Recurrence, string>;
const INTERVALS = [30, 60, 90, 120, 180, 240] as const;
/** Monday first; the values are JS weekdays (0 = Sunday), as the server stores them. */
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0] as const;

const isRecurrence = (value: string): value is Recurrence => (RECURRENCES as readonly string[]).includes(value);

/** New custom reminder, or edit one (`?id=`) — web: AddReminderDialog / EditReminderDialog. */
export default function ReminderFormScreen() {
  const t = useTranslations("settings.reminderDialog");
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const reminders = useReminders();

  if (id != null && reminders.isLoading) return <LoadingView />;
  const reminder = id != null ? reminders.data?.find((r) => r.id === id) : undefined;
  if (id != null && !reminder) return <ErrorView error={reminders.error} onRetry={() => reminders.refetch()} />;

  return (
    <>
      <Stack.Screen options={{ title: reminder ? t("editTitle") : t("addTitle") }} />
      <ReminderForm key={reminder?.id ?? "new"} reminder={reminder} />
    </>
  );
}

function initialState(reminder: ReminderDto | undefined) {
  return {
    title: reminder?.title ?? "",
    body: reminder?.body ?? "",
    time: reminder?.time ?? "09:00",
    recurrence: reminder && isRecurrence(reminder.recurrence) ? reminder.recurrence : ("daily" as Recurrence),
    intervalMinutes: reminder?.intervalMinutes ?? 120,
    intervalStart: reminder?.intervalStart ?? "08:00",
    intervalEnd: reminder?.intervalEnd ?? "22:00",
    daysOfWeek: Array.isArray(reminder?.daysOfWeek) ? (reminder.daysOfWeek as number[]) : [],
    onceDate: reminder?.onceDate ?? todayStr(),
    skipEmail: reminder?.skipEmail ?? true,
  };
}

function ReminderForm({ reminder }: { reminder: ReminderDto | undefined }) {
  const t = useTranslations("settings.reminderDialog");
  const tTpl = useTranslations("reminderTemplates");
  const tm = useTranslations("mobile.reminders");
  const tc = useTranslations("common");
  const errorMessage = useErrorMessage();
  const create = useCreateReminder();
  const update = useUpdateReminder();
  const remove = useDeleteReminder();
  const [initial] = useState(() => initialState(reminder));
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;
  const { leave } = useCloseGuard(JSON.stringify(form) !== JSON.stringify(initial) && !saving);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const applyTemplate = (tpl: ReminderTemplate) =>
    set({
      title: tTpl(`${tpl.key}.title`),
      body: tTpl(`${tpl.key}.body`),
      recurrence: tpl.defaultRecurrence,
      ...(tpl.defaultTime ? { time: tpl.defaultTime } : {}),
      ...(tpl.defaultRecurrence === "interval"
        ? {
            intervalMinutes: tpl.defaultIntervalMinutes ?? form.intervalMinutes,
            intervalStart: tpl.defaultIntervalStart ?? form.intervalStart,
            intervalEnd: tpl.defaultIntervalEnd ?? form.intervalEnd,
          }
        : {}),
    });

  const toggleDay = (day: number) =>
    set({ daysOfWeek: form.daysOfWeek.includes(day) ? form.daysOfWeek.filter((d) => d !== day) : [...form.daysOfWeek, day] });

  const submit = () => {
    setError(null);
    if (!form.title.trim()) return setError(tm("titleRequired"));
    if (form.recurrence === "custom" && form.daysOfWeek.length === 0) return setError(tm("daysRequired"));
    const interval = form.recurrence === "interval";
    const fields = {
      title: form.title.trim(),
      recurrence: form.recurrence,
      time: interval ? undefined : form.time,
      intervalMinutes: interval ? form.intervalMinutes : undefined,
      intervalStart: interval ? form.intervalStart : undefined,
      intervalEnd: interval ? form.intervalEnd : undefined,
      daysOfWeek: form.recurrence === "custom" ? form.daysOfWeek : undefined,
      onceDate: form.recurrence === "once" ? form.onceDate : undefined,
      skipEmail: form.skipEmail,
    };
    const done = { onSuccess: leave, onError: (err: unknown) => setError(errorMessage(err)) };
    if (reminder) {
      // An emptied message clears it (the PATCH leaves fields it doesn't get).
      const parsed = reminderUpdateSchema.safeParse({ ...fields, body: form.body.trim() });
      if (!parsed.success) return setError(errorMessage(null));
      update.mutate({ id: reminder.id, patch: parsed.data }, done);
    } else {
      const parsed = reminderCreateSchema.safeParse({ type: "custom", ...fields, body: form.body.trim() || undefined });
      if (!parsed.success) return setError(errorMessage(null));
      create.mutate(parsed.data, done);
    }
  };

  const confirmDelete = () => {
    if (!reminder) return;
    Alert.alert(tc("delete"), reminder.title, [
      { text: tc("cancel"), style: "cancel" },
      {
        text: tc("delete"),
        style: "destructive",
        onPress: () => remove.mutate(reminder.id, { onSuccess: leave, onError: (err) => setError(errorMessage(err)) }),
      },
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
      {reminder ? null : (
        <Card>
          <AppText variant="small">{t("quickTemplates")}</AppText>
          <View style={styles.chips}>
            {REMINDER_TEMPLATES.map((tpl) => (
              <Chip key={tpl.key} label={tTpl(`${tpl.key}.title`)} selected={false} onPress={() => applyTemplate(tpl)} />
            ))}
          </View>
        </Card>
      )}

      <Card>
        <Field label={t("titleLabel")}>
          <Input value={form.title} onChangeText={(title) => set({ title })} placeholder={t("titlePlaceholder")} maxLength={100} />
        </Field>
        <Field label={t("bodyLabel")}>
          <Input value={form.body} onChangeText={(body) => set({ body })} placeholder={t("bodyPlaceholder")} maxLength={500} multiline />
        </Field>
      </Card>

      <Card>
        <AppText variant="small">{t("recurrenceLabel")}</AppText>
        <View style={styles.chips}>
          {RECURRENCES.map((r) => (
            <Chip key={r} label={t(RECURRENCE_LABEL[r])} selected={form.recurrence === r} onPress={() => set({ recurrence: r })} />
          ))}
        </View>

        {form.recurrence === "interval" ? (
          <>
            <AppText variant="small">{t("intervalLabel")}</AppText>
            <View style={styles.chips}>
              {INTERVALS.map((m) => (
                <Chip key={m} label={t(`interval${m}`)} selected={form.intervalMinutes === m} onPress={() => set({ intervalMinutes: m })} />
              ))}
            </View>
            <View style={styles.row}>
              <AppText variant="muted" style={styles.grow}>
                {t("rangeStart")}
              </AppText>
              <TimeField value={form.intervalStart} onChange={(intervalStart) => set({ intervalStart })} accessibilityLabel={t("rangeStart")} />
            </View>
            <View style={styles.row}>
              <AppText variant="muted" style={styles.grow}>
                {t("rangeEnd")}
              </AppText>
              <TimeField value={form.intervalEnd} onChange={(intervalEnd) => set({ intervalEnd })} accessibilityLabel={t("rangeEnd")} />
            </View>
            <AppText variant="small">{t("intervalHint")}</AppText>
          </>
        ) : (
          <View style={styles.row}>
            <AppText variant="muted" style={styles.grow}>
              {t("timeLabel")}
            </AppText>
            <TimeField value={form.time} onChange={(time) => set({ time })} accessibilityLabel={t("timeLabel")} />
          </View>
        )}

        {form.recurrence === "custom" ? (
          <View style={styles.chips}>
            {DAY_VALUES.map((d) => (
              <Chip key={d} label={t(`days.${d}`)} selected={form.daysOfWeek.includes(d)} onPress={() => toggleDay(d)} />
            ))}
          </View>
        ) : null}

        {form.recurrence === "once" ? (
          <View style={styles.row}>
            <AppText variant="muted" style={styles.grow}>
              {t("onceDateLabel")}
            </AppText>
            <DateField
              value={form.onceDate}
              onChange={(onceDate) => set({ onceDate })}
              minimumDate={todayStr()}
              accessibilityLabel={t("onceDateLabel")}
            />
          </View>
        ) : null}
      </Card>

      <Card style={styles.row}>
        <AppText style={styles.grow}>{t("emailToggle")}</AppText>
        <Switch
          value={!form.skipEmail}
          onValueChange={(on) => set({ skipEmail: !on })}
          accessibilityLabel={t("emailToggle")}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </Card>

      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      <Button label={saving ? t("saving") : t("save")} loading={saving} onPress={submit} />
      {reminder ? <Button label={tc("delete")} variant="danger" loading={remove.isPending} onPress={confirmDelete} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1 },
  error: { color: colors.danger, textAlign: "center" },
});
