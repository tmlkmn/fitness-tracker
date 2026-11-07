import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReminderDto } from "@fitmusc/shared/api/dto";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { REMINDER_TEMPLATES, type ReminderTemplate, type ReminderTemplateKey } from "@fitmusc/shared/reminder-templates";
import { Stack, useRouter } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { TimeField } from "@/components/form";
import { AppText, Banner, Button, Card, Chip, ErrorView, LoadingView, Screen, Segmented, useErrorMessage } from "@/components/ui";
import { useEnsureTimezone, useNotificationPreferences, useUpdatePreferences } from "@/hooks/notifications";
import {
  useCreateFromTemplate,
  useCreateReminder,
  useDeleteReminder,
  useReminders,
  useToggleReminder,
  useUpdateReminder,
} from "@/hooks/reminders";
import { colors, radius, spacing } from "@/lib/theme";

type Tab = "templates" | "schedule" | "custom";
type IconName = ComponentProps<typeof Ionicons>["name"];

const TEMPLATE_ICONS: Record<ReminderTemplateKey, IconName> = {
  water: "water-outline",
  stretching: "body-outline",
  posture: "accessibility-outline",
  supplement: "medkit-outline",
  sleep: "moon-outline",
  steps: "footsteps-outline",
};
const MINUTE_OPTIONS = [5, 10, 15, 30] as const;
const DEFAULT_WORKOUT_TIME = "19:00";

/** Preset, meal / workout and custom reminders (web: ReminderSettingsCard). */
export default function RemindersScreen() {
  const t = useTranslations("settings.remindersCard");
  const errorMessage = useErrorMessage();
  const reminders = useReminders();
  const prefs = useNotificationPreferences();
  useEnsureTimezone(prefs.data);
  const [tab, setTab] = useState<Tab>("templates");
  const [error, setError] = useState<string | null>(null);

  if (reminders.isLoading) return <LoadingView />;
  if (!reminders.data) return <ErrorView error={reminders.error} onRetry={() => reminders.refetch()} />;

  const all = reminders.data;
  const meal = all.find((r) => r.type === "meal");
  const workout = all.find((r) => r.type === "workout");
  const templates = all.filter((r) => r.type === "custom" && r.templateKey);
  const custom = all.filter((r) => r.type === "custom" && !r.templateKey);
  const activeTemplates = templates.filter((r) => r.isEnabled).length;
  const activeSchedule = (meal?.isEnabled ? 1 : 0) + (workout?.isEnabled ? 1 : 0);
  const withCount = (label: string, count: number) => (count > 0 ? `${label} ${count}` : label);
  const onError = (err: unknown) => setError(errorMessage(err));

  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <Screen onRefresh={() => reminders.refetch()}>
        {activeTemplates + activeSchedule + custom.length === 0 ? (
          <Banner icon={<Ionicons name="sparkles-outline" size={16} color={colors.warning} />}>{t("onboardingHint")}</Banner>
        ) : null}
        <Segmented
          options={[
            { value: "templates", label: withCount(t("tabTemplates"), activeTemplates) },
            { value: "schedule", label: withCount(t("tabSchedule"), activeSchedule) },
            { value: "custom", label: withCount(t("tabCustom"), custom.length) },
          ]}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setError(null);
          }}
        />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}
        {tab === "templates"
          ? REMINDER_TEMPLATES.map((tpl) => (
              <TemplateRow key={tpl.key} template={tpl} reminder={templates.find((r) => r.templateKey === tpl.key)} onError={onError} />
            ))
          : null}
        {tab === "schedule" ? (
          <ScheduleTab meal={meal} workout={workout} workoutTime={prefs.data?.defaultWorkoutTime ?? DEFAULT_WORKOUT_TIME} onError={onError} />
        ) : null}
        {tab === "custom" ? <CustomTab reminders={custom} onError={onError} /> : null}
      </Screen>
    </>
  );
}

/** "08:00–22:00 · every 2 hours", "09:00 · every day" — a template reminder's schedule. */
function useTemplateSchedule() {
  const t = useTranslations("settings.remindersCard");
  return (reminder: ReminderDto, tpl: ReminderTemplate) => {
    if (reminder.recurrence === "interval") {
      const min = reminder.intervalMinutes ?? tpl.defaultIntervalMinutes ?? 60;
      const freq = min >= 60 ? t("intervalHourly", { hours: min / 60 }) : t("intervalMinutely", { minutes: min });
      return `${reminder.intervalStart ?? tpl.defaultIntervalStart ?? "08:00"}–${reminder.intervalEnd ?? tpl.defaultIntervalEnd ?? "22:00"} · ${freq}`;
    }
    const recurrence = reminder.recurrence === "daily" ? t("recurrenceDaily") : t("recurrenceWeekdays");
    return `${reminder.time ?? tpl.defaultTime ?? ""} · ${recurrence}`;
  };
}

function TemplateRow({
  template,
  reminder,
  onError,
}: {
  template: ReminderTemplate;
  reminder: ReminderDto | undefined;
  onError: (err: unknown) => void;
}) {
  const t = useTranslations("reminderTemplates");
  const schedule = useTemplateSchedule();
  const create = useCreateFromTemplate();
  const remove = useDeleteReminder();
  const active = Boolean(reminder?.isEnabled);
  const busy = create.isPending || remove.isPending;
  const title = t(`${template.key}.title`);

  const toggle = (on: boolean) => {
    // Like the web: on creates (or re-enables) it with the preset's schedule, off deletes it.
    if (on) create.mutate(template.key, { onError });
    else if (reminder) remove.mutate(reminder.id, { onError });
  };

  return (
    <Card style={[styles.row, active && styles.activeCard]}>
      <View style={[styles.icon, active && styles.iconActive]}>
        <Ionicons name={TEMPLATE_ICONS[template.key]} size={18} color={active ? colors.primary : colors.textMuted} />
      </View>
      <View style={styles.grow}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText variant="small" numberOfLines={2}>
          {active && reminder ? schedule(reminder, template) : t(`${template.key}.body`)}
        </AppText>
      </View>
      <Switch
        value={busy ? !active : active}
        disabled={busy}
        onValueChange={toggle}
        accessibilityLabel={title}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </Card>
  );
}

function ScheduleTab({
  meal,
  workout,
  workoutTime,
  onError,
}: {
  meal: ReminderDto | undefined;
  workout: ReminderDto | undefined;
  workoutTime: string;
  onError: (err: unknown) => void;
}) {
  const t = useTranslations("settings.remindersCard");
  const create = useCreateReminder();
  const toggle = useToggleReminder();
  const update = useUpdateReminder();
  const updatePrefs = useUpdatePreferences();

  const setEnabled = (kind: "meal" | "workout", existing: ReminderDto | undefined, on: boolean) => {
    if (existing) return toggle.mutate({ id: existing.id, isEnabled: on }, { onError });
    if (!on) return;
    // Defaults as on the web; e-mail off for these frequent ones.
    create.mutate(
      kind === "meal"
        ? { type: "meal", title: t("defaultMealTitle"), body: t("defaultMealBody"), minutesBefore: 10, recurrence: "daily", skipEmail: true }
        : { type: "workout", title: t("defaultWorkoutTitle"), body: t("defaultWorkoutBody"), minutesBefore: 15, recurrence: "daily", skipEmail: true },
      { onError },
    );
  };
  const minutes = (reminder: ReminderDto, fallback: number) => (
    <View style={styles.minutes}>
      <AppText variant="muted">{t("minutesBeforeLabel")}</AppText>
      <View style={styles.chips}>
        {MINUTE_OPTIONS.map((m) => (
          <Chip
            key={m}
            label={t(`minute${m}`)}
            selected={(reminder.minutesBefore ?? fallback) === m}
            onPress={() => update.mutate({ id: reminder.id, patch: { minutesBefore: m } }, { onError })}
          />
        ))}
      </View>
    </View>
  );

  return (
    <>
      <Card>
        <SwitchLine
          icon="restaurant-outline"
          label={t("mealRemindersLabel")}
          value={meal?.isEnabled ?? false}
          disabled={create.isPending}
          onChange={(on) => setEnabled("meal", meal, on)}
        />
        {meal?.isEnabled ? minutes(meal, 10) : null}
      </Card>
      <Card>
        <SwitchLine
          icon="barbell-outline"
          label={t("workoutReminderLabel")}
          value={workout?.isEnabled ?? false}
          disabled={create.isPending}
          onChange={(on) => setEnabled("workout", workout, on)}
        />
        {workout?.isEnabled ? (
          <>
            <View style={styles.row}>
              <AppText variant="muted" style={styles.grow}>
                {t("workoutTimeLabel")}
              </AppText>
              <TimeField
                value={workoutTime}
                onChange={(time) => updatePrefs.mutate({ defaultWorkoutTime: time }, { onError })}
                accessibilityLabel={t("workoutTimeLabel")}
              />
            </View>
            {minutes(workout, 15)}
          </>
        ) : null}
      </Card>
    </>
  );
}

function SwitchLine({
  icon,
  label,
  value,
  disabled,
  onChange,
}: {
  icon: IconName;
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <AppText style={[styles.grow, styles.title]}>{label}</AppText>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: colors.primary, false: colors.border }}
      />
    </View>
  );
}

function CustomTab({ reminders, onError }: { reminders: ReminderDto[]; onError: (err: unknown) => void }) {
  const t = useTranslations("settings");
  const router = useRouter();
  return (
    <>
      {reminders.length === 0 ? <AppText variant="muted">{t("remindersCard.noCustomReminders")}</AppText> : null}
      {reminders.map((r) => (
        <CustomRow key={r.id} reminder={r} onError={onError} />
      ))}
      <Button icon="add" label={t("reminderDialog.addNew")} variant="secondary" onPress={() => router.push("/reminder-form")} />
    </>
  );
}

/** "09:00 · Every day", "Every 2 h · 08:00-22:00 · Every day", "21:00 · Mon, Wed". */
function useReminderSummary() {
  const t = useTranslations("settings");
  const locale = useLocale() as Locale;
  return (r: ReminderDto) => {
    const parts: string[] = [];
    if (r.recurrence === "interval" && r.intervalMinutes) {
      const min = r.intervalMinutes;
      parts.push(min >= 60 ? t("reminderItem.intervalHourly", { hours: min / 60 }) : t("reminderItem.intervalMinutely", { minutes: min }));
      if (r.intervalStart && r.intervalEnd) parts.push(`${r.intervalStart}-${r.intervalEnd}`);
    } else if (r.time) {
      parts.push(r.time);
    }
    switch (r.recurrence) {
      case "weekdays":
        parts.push(t("reminderItem.recurrenceWeekdays"));
        break;
      case "weekends":
        parts.push(t("reminderItem.recurrenceWeekends"));
        break;
      case "once":
        parts.push(r.onceDate ? formatDate(parseDateOnly(r.onceDate), locale, { day: "numeric", month: "short" }) : t("reminderItem.recurrenceOnce"));
        break;
      case "custom": {
        const days = Array.isArray(r.daysOfWeek) ? (r.daysOfWeek as number[]) : [];
        // Monday first, like the form.
        const ordered = [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d));
        parts.push(ordered.length ? ordered.map((d) => t(`reminderDialog.days.${d as 0 | 1 | 2 | 3 | 4 | 5 | 6}`)).join(", ") : t("reminderItem.recurrenceCustom"));
        break;
      }
      default:
        parts.push(t("reminderItem.recurrenceDaily"));
    }
    return parts.join(" · ");
  };
}

function CustomRow({ reminder, onError }: { reminder: ReminderDto; onError: (err: unknown) => void }) {
  const router = useRouter();
  const summary = useReminderSummary();
  const toggle = useToggleReminder();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/reminder-form", params: { id: String(reminder.id) } })}
    >
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.pressed]}>
          <View style={styles.grow}>
            <AppText style={styles.title}>{reminder.title}</AppText>
            <AppText variant="small">{summary(reminder)}</AppText>
          </View>
          <Switch
            value={reminder.isEnabled}
            onValueChange={(isEnabled) => toggle.mutate({ id: reminder.id, isEnabled }, { onError })}
            accessibilityLabel={reminder.title}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  title: { fontWeight: "600" },
  activeCard: { borderColor: colors.primary, borderWidth: 1 },
  pressed: { backgroundColor: colors.cardPressed },
  icon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", backgroundColor: colors.cardPressed },
  iconActive: { backgroundColor: "#22c55e22" },
  minutes: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  error: { color: colors.danger, textAlign: "center" },
});
