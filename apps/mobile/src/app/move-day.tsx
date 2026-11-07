import Ionicons from "@expo/vector-icons/Ionicons";
import type { DailyPlanDto, DailyPlanSummaryDto } from "@fitmusc/shared/api/dto";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { ErrorBox } from "@/components/ai";
import { planTypeStyle } from "@/components/plan-type";
import { AppText, Button, Card, ErrorView, LoadingView, useErrorMessage } from "@/components/ui";
import { IconCircle, Pill } from "@/components/visual";
import { useDaySummaries } from "@/hooks/calendar";
import { useDay, useMoveDayContents } from "@/hooks/plan";
import { ApiRequestError } from "@/lib/api";
import { todayStr } from "@/lib/dates";
import { colors, radius, spacing, withAlpha } from "@/lib/theme";

type Mode = "swap" | "replace";

// Error code from POST /days/[id]/move → its text in workout.moveDialog.errors.
const ERROR_KEY: Partial<Record<string, "sameDay" | "nothingSelected" | "differentWeek" | "notFound">> = {
  SAME_DAY: "sameDay",
  NOTHING_SELECTED: "nothingSelected",
  DIFFERENT_WEEK: "differentWeek",
  NOT_FOUND: "notFound",
};

/**
 * Moves (or swaps) a day's workout and/or meals onto another day of the same
 * week — the web's MoveDayContentsDialog. `what` picks what is ticked first.
 */
export default function MoveDayScreen() {
  const t = useTranslations("workout.moveDialog");
  const params = useLocalSearchParams<{ dayId: string; what?: string }>();
  const day = useDay(Number(params.dayId));
  const days = useDaySummaries(day.data?.weeklyPlanId);
  if (day.isLoading || days.isLoading) return <LoadingView />;
  if (!day.data) return <ErrorView error={day.error} onRetry={() => day.refetch()} />;
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <MoveForm source={day.data} days={days.data ?? []} what={params.what === "workout" ? "workout" : "meals"} />
    </>
  );
}

function MoveForm({ source, days, what }: { source: DailyPlanDto; days: DailyPlanSummaryDto[]; what: "meals" | "workout" }) {
  const t = useTranslations("workout.moveDialog");
  const tp = useTranslations("dashboard.planTypes");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const move = useMoveDayContents(source.id);
  const [includeWorkout, setIncludeWorkout] = useState(what === "workout");
  const [includeMeals, setIncludeMeals] = useState(what === "meals");
  const [targetId, setTargetId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("swap");
  const [error, setError] = useState<string | null>(null);

  const today = todayStr();
  const me = days.find((d) => d.id === source.id);
  const counts = { exercise: me?.exerciseCount ?? 0, meal: me?.mealCount ?? 0 };
  // Same week, today or later (past days are read-only).
  const candidates = days.filter((d) => d.id !== source.id && (!d.date || d.date >= today));
  const target = candidates.find((d) => d.id === targetId) ?? null;
  const targetHasWorkout = target?.planType === "workout" || target?.planType === "swimming";
  const showMode = includeWorkout && targetHasWorkout;
  const effectiveMode = showMode ? mode : "move";

  const label = (d: { dayName: string; date: string | null }) =>
    d.date ? `${d.dayName} ${formatDate(parseDateOnly(d.date), locale, { day: "numeric", month: "short" })}` : d.dayName;

  const preview = (() => {
    if (!target) return null;
    const values = { source: label(source), target: label(target) };
    if (effectiveMode === "swap") return t("previewSwap", values);
    const parts = [
      includeWorkout && counts.exercise > 0 ? t("exerciseUnit", { count: counts.exercise }) : null,
      includeMeals && counts.meal > 0 ? t("mealUnit", { count: counts.meal }) : null,
    ].filter((p): p is string => p != null);
    const summary = parts.length > 0 ? parts.join(" + ") : t("summaryEmpty");
    if (effectiveMode === "move") return t("previewMove", { ...values, summary });
    const deleted = [
      includeWorkout && target.exerciseCount > 0 ? t("exerciseUnit", { count: target.exerciseCount }) : null,
      includeMeals && target.mealCount > 0 ? t("mealUnit", { count: target.mealCount }) : null,
    ].filter((p): p is string => p != null);
    return (
      t("previewReplace", { ...values, summary }) +
      (deleted.length > 0 ? t("previewDeleted", { target: values.target, items: deleted.join(" + ") }) : "")
    );
  })();

  const submit = () => {
    if (!target) return;
    setError(null);
    move.mutate(
      { targetDailyPlanId: target.id, mode: effectiveMode, includeWorkout, includeMeals },
      {
        onSuccess: (result) => {
          const parts = [
            result.movedExerciseCount > 0 ? t("toast.exercises", { count: result.movedExerciseCount }) : null,
            result.movedMealCount > 0 ? t("toast.meals", { count: result.movedMealCount }) : null,
          ].filter((p): p is string => p != null);
          const values = { target: label(target), summary: parts.length > 0 ? ` (${parts.join(", ")})` : "" };
          router.back();
          Alert.alert(t("title"), result.mode === "swap" ? t("toast.swapped", values) : t("toast.moved", values));
        },
        onError: (err) => {
          const key = err instanceof ApiRequestError ? ERROR_KEY[err.code] : undefined;
          setError(key ? t(`errors.${key}`) : errorMessage(err));
        },
      },
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <AppText variant="muted">{label(source)} → ?</AppText>

      <Section title={t("whatToMove")}>
        <Check
          icon="barbell-outline"
          label={t("workout")}
          count={t("exerciseCount", { count: counts.exercise })}
          checked={includeWorkout}
          disabled={counts.exercise === 0}
          onPress={() => setIncludeWorkout(!includeWorkout)}
        />
        <Check
          icon="restaurant-outline"
          label={t("nutrition")}
          count={t("mealCount", { count: counts.meal })}
          checked={includeMeals}
          disabled={counts.meal === 0}
          onPress={() => setIncludeMeals(!includeMeals)}
        />
      </Section>

      <Section title={t("targetDay")}>
        {candidates.length === 0 ? (
          <Card>
            <AppText variant="muted" style={styles.center}>
              {t("noTargets")}
            </AppText>
          </Card>
        ) : (
          candidates.map((day) => {
            const style = planTypeStyle(day.planType);
            const empty = day.exerciseCount === 0 && day.mealCount === 0;
            return (
              <Option key={day.id} selected={day.id === targetId} onPress={() => setTargetId(day.id)}>
                <IconCircle icon={style.icon} color={style.color} size={32} />
                <View style={styles.grow}>
                  <AppText style={styles.optionTitle}>{label(day)}</AppText>
                  <AppText variant="small" numberOfLines={1}>
                    {day.workoutTitle ?? tp(day.planType as "workout")}
                  </AppText>
                </View>
                <View style={styles.pills}>
                  {day.exerciseCount > 0 ? <Pill label={t("exerciseCount", { count: day.exerciseCount })} color={colors.textMuted} /> : null}
                  {day.mealCount > 0 ? <Pill label={t("mealCount", { count: day.mealCount })} color={colors.textMuted} /> : null}
                  {empty && day.planType === "rest" ? <Pill label={t("rest")} color={style.color} /> : null}
                </View>
              </Option>
            );
          })
        )}
      </Section>

      {showMode ? (
        <Section title={t("modeQuestion")}>
          <Option selected={mode === "swap"} onPress={() => setMode("swap")}>
            <View style={styles.grow}>
              <AppText style={styles.optionTitle}>{t("modeSwap")}</AppText>
              <AppText variant="small">{t("modeSwapDesc")}</AppText>
            </View>
          </Option>
          <Option selected={mode === "replace"} onPress={() => setMode("replace")}>
            <View style={styles.grow}>
              <AppText style={styles.optionTitle}>{t("modeReplace")}</AppText>
              <AppText variant="small">{t("modeReplaceDesc")}</AppText>
            </View>
          </Option>
        </Section>
      ) : null}

      {preview ? (
        <View style={styles.preview}>
          <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
          <AppText variant="small" style={styles.grow}>
            {preview}
          </AppText>
        </View>
      ) : null}

      {error ? <ErrorBox message={error} /> : null}
      <Button
        label={move.isPending ? t("submitting") : t("submit")}
        icon="swap-horizontal"
        loading={move.isPending}
        disabled={!target || (!includeWorkout && !includeMeals)}
        onPress={submit}
      />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="small" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Option({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionOn, pressed && !selected && styles.optionPressed]}
    >
      {children}
    </Pressable>
  );
}

function Check({
  icon,
  label,
  count,
  checked,
  disabled,
  onPress,
}: {
  icon: "barbell-outline" | "restaurant-outline";
  label: string;
  count: string;
  checked: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.option, checked && styles.optionOn, pressed && styles.optionPressed, disabled && styles.disabled]}
    >
      <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? colors.primary : colors.textMuted} />
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <AppText style={[styles.grow, styles.optionTitle]}>{label}</AppText>
      <Pill label={count} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  grow: { flex: 1, gap: 2 },
  center: { textAlign: "center" },
  section: { gap: spacing.sm },
  sectionTitle: { fontWeight: "600" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.1) },
  optionPressed: { backgroundColor: colors.cardPressed },
  optionTitle: { fontWeight: "600" },
  disabled: { opacity: 0.4 },
  pills: { alignItems: "flex-end", gap: 4 },
  preview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.25),
    backgroundColor: withAlpha(colors.primary, 0.06),
  },
});
