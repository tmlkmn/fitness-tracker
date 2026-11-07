import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AiButton, JobBanner } from "@/components/ai";
import { ExerciseSections, MealItem } from "@/components/plan-items";
import { PLAN_TYPES_SHOWN, PlanTypeIcon, planTypeStyle } from "@/components/plan-type";
import { AppText, Button, Card, Chip, LoadingView, Screen, Segmented, useErrorMessage } from "@/components/ui";
import { IconCircle, Pill } from "@/components/visual";
import { useCalendarWeek, useWeeklyAiGate } from "@/hooks/ai";
import { useDayByDate, useDaySummaries, usePlanTypes, useWeekStart } from "@/hooks/calendar";
import { aiWeekOf } from "@/lib/ai-weekly";
import { useEnsureDay } from "@/hooks/edit";
import { useDayExercises, useDayMeals, useToggleExercise, useToggleMeal } from "@/hooks/plan";
import { useProfile } from "@/hooks/wellness";
import { addDays, isWeekPast, monthGrid, monthOf, shiftMonth, todayStr, weekDates } from "@/lib/dates";
import { colors, radius, spacing, withAlpha } from "@/lib/theme";
import { openWebPage } from "@/lib/web-links";

type Mode = "week" | "month";

export default function CalendarScreen() {
  const t = useTranslations("calendar");
  const locale = useLocale() as Locale;
  const weekStartsOn = useWeekStart();
  const today = todayStr();
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<Mode>("week");
  const [view, setView] = useState(() => monthOf(today));

  const week = weekDates(selected, weekStartsOn);
  const months =
    mode === "week" ? uniqueMonths([week[0], week[6]]) : [view];
  const planTypes = usePlanTypes(months);
  const day = useDayByDate(selected);
  const summaries = useDaySummaries(day.data?.weeklyPlanId);

  const shiftWeek = (by: 1 | -1) => {
    const target = addDays(week[0], by * 7);
    // Landing on the current week selects today, like the web.
    setSelected(weekDates(target, weekStartsOn).includes(today) ? today : target);
  };
  const changeMode = (next: Mode) => {
    if (next === "month") setView(monthOf(selected));
    setMode(next);
  };
  const goToday = () => {
    setSelected(today);
    setView(monthOf(today));
  };

  const fmt = (date: string, options: Intl.DateTimeFormatOptions) => formatDate(parseDateOnly(date), locale, options);
  const isCurrent = mode === "week" ? week.includes(today) : view.year === monthOf(today).year && view.month === monthOf(today).month;

  return (
    <Screen
      refreshing={planTypes.isRefetching || day.isRefetching}
      onRefresh={() => {
        void planTypes.refetch();
        void day.refetch();
        void summaries.refetch();
      }}
    >
      <Segmented
        options={[
          { value: "week", label: t("weeklyView") },
          { value: "month", label: t("fullCalendar") },
        ]}
        value={mode}
        onChange={changeMode}
      />

      <Card>
        <View style={styles.navRow}>
          <NavButton
            icon="chevron-back"
            label={mode === "week" ? t("prevWeek") : t("prevMonth")}
            onPress={() => (mode === "week" ? shiftWeek(-1) : setView(shiftMonth(view.year, view.month, -1)))}
          />
          <AppText variant="heading" style={styles.navTitle}>
            {mode === "week"
              ? `${fmt(week[0], { day: "numeric", month: "short" })} – ${fmt(week[6], { day: "numeric", month: "short" })}`
              : formatDate(new Date(view.year, view.month - 1, 1), locale, { month: "long", year: "numeric" })}
          </AppText>
          <NavButton
            icon="chevron-forward"
            label={mode === "week" ? t("nextWeek") : t("nextMonth")}
            onPress={() => (mode === "week" ? shiftWeek(1) : setView(shiftMonth(view.year, view.month, 1)))}
          />
        </View>

        <View style={styles.weekRow}>
          {week.map((date) => (
            <AppText key={date} variant="small" style={styles.weekday}>
              {fmt(date, { weekday: "short" })}
            </AppText>
          ))}
        </View>

        {mode === "week" ? (
          <View style={styles.weekRow}>
            {week.map((date) => (
              <DayCell
                key={date}
                date={date}
                label={fmt(date, { weekday: "long", day: "numeric", month: "long" })}
                planType={planTypes.byDate.get(date)}
                selected={date === selected}
                isToday={date === today}
                onPress={() => setSelected(date)}
              />
            ))}
          </View>
        ) : (
          monthGrid(view.year, view.month, weekStartsOn).map((row) => (
            <View key={row.find(Boolean)} style={styles.weekRow}>
              {row.map((date, i) =>
                date ? (
                  <DayCell
                    key={date}
                    date={date}
                    label={fmt(date, { weekday: "long", day: "numeric", month: "long" })}
                    planType={planTypes.byDate.get(date)}
                    selected={date === selected}
                    isToday={date === today}
                    onPress={() => setSelected(date)}
                  />
                ) : (
                  <View key={`empty-${i}`} style={styles.cell} />
                ),
              )}
            </View>
          ))
        )}

        <Legend />
        {isCurrent ? null : (
          <View style={styles.todayRow}>
            <Chip label={t("today")} selected={false} onPress={goToday} />
          </View>
        )}
      </Card>

      <WeeklyAi date={selected} />
      <SelectedDay date={selected} day={day} summaries={summaries} />
    </Screen>
  );
}

/** "AI ile Haftalık Plan Oluştur / Değiştir" for the (Monday-based) week of the selected day. */
function WeeklyAi({ date }: { date: string }) {
  const t = useTranslations("calendar");
  const tm = useTranslations("mobile.ai");
  const router = useRouter();
  const week = useCalendarWeek(date);
  const hasPlan = week.data?.weeklyPlan != null;
  const gate = useWeeklyAiGate(date, hasPlan);
  const monday = aiWeekOf(date).monday;
  return (
    <>
      <JobBanner kind="weekly" belongs={(job) => job.kind === "weekly" && aiWeekOf(job.input.dateStr).monday === monday} />
      {week.data && gate.shown ? (
        <>
          <AiButton
            label={t("aiWeeklyPlan", { action: hasPlan ? t("actionChange") : t("actionCreate") })}
            feature="weekly"
            disabled={gate.gap}
            onPress={() => router.push({ pathname: "/ai/weekly", params: { date } })}
          />
          {gate.gap ? <AppText variant="small">{tm("emptyWeekGap")}</AppText> : null}
        </>
      ) : null}
    </>
  );
}

function uniqueMonths(dates: string[]) {
  const seen = new Map<string, { year: number; month: number }>();
  for (const date of dates) seen.set(date.slice(0, 7), monthOf(date));
  return [...seen.values()];
}

function NavButton({ icon, label, onPress }: { icon: "chevron-back" | "chevron-forward"; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.navButton, pressed && { backgroundColor: colors.cardPressed }]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

function DayCell({
  date,
  label,
  planType,
  selected,
  isToday,
  onPress,
}: {
  date: string;
  label: string;
  planType: string | undefined;
  selected: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  const t = useTranslations("dashboard.planTypes");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={planType ? `${label}, ${t(planType)}` : label}
      onPress={onPress}
      style={[styles.cell, styles.cellButton, selected && styles.cellSelected, isToday && !selected && styles.cellToday]}
    >
      <AppText style={[styles.dayNumber, isToday && !selected && styles.dayNumberToday, selected && styles.dayNumberSelected]}>{Number(date.slice(8, 10))}</AppText>
      <View style={styles.cellIcon}>
        {planType ? <PlanTypeIcon planType={planType} size={13} color={selected ? colors.primaryText : undefined} /> : null}
      </View>
    </Pressable>
  );
}

function Legend() {
  const t = useTranslations();
  return (
    <View style={styles.legend} accessible accessibilityLabel={t("mobile.calendar.legend")}>
      {PLAN_TYPES_SHOWN.map((type) => (
        <View key={type} style={styles.legendItem}>
          <PlanTypeIcon planType={type} size={12} />
          <AppText variant="small">{t(`dashboard.planTypes.${type}`)}</AppText>
        </View>
      ))}
    </View>
  );
}

function SelectedDay({
  date,
  day,
  summaries,
}: {
  date: string;
  day: ReturnType<typeof useDayByDate>;
  summaries: ReturnType<typeof useDaySummaries>;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const ensureDay = useEnsureDay();
  const errorMessage = useErrorMessage();
  // The day's week (same query as WeeklyAi): past weeks can't be shared.
  const week = useCalendarWeek(date);
  const weekStart = week.data?.weeklyPlan?.startDate ?? null;
  const heading = formatDate(parseDateOnly(date), locale, { weekday: "long", day: "numeric", month: "long" });

  if (day.isLoading) {
    return (
      <Card style={{ minHeight: 120 }}>
        <LoadingView />
      </Card>
    );
  }

  const plan = day.data;
  if (!plan) {
    return (
      <Card>
        <AppText variant="heading">{heading}</AppText>
        <AppText variant="muted">{t("calendar.noPlanForDate")}</AppText>
        <AppText variant="small">{t("mobile.calendar.noPlanHint")}</AppText>
        {ensureDay.error ? <AppText style={{ color: colors.danger }}>{errorMessage(ensureDay.error)}</AppText> : null}
        <Button
          icon="add"
          label={t("calendar.manualAdd")}
          loading={ensureDay.isPending}
          onPress={() => ensureDay.mutate(date, { onSuccess: ({ id }) => router.push(`/day/${id}`) })}
        />
        <Button label={t("mobile.blocked.openWeb")} variant="ghost" onPress={() => openWebPage("home", locale)} />
      </Card>
    );
  }

  const summary = summaries.data?.find((s) => s.id === plan.id);
  const style = planTypeStyle(plan.planType);
  const canShare = plan.weeklyPlanId != null && week.data?.weeklyPlan?.id === plan.weeklyPlanId && !(weekStart && isWeekPast(weekStart));
  return (
    <>
      <Card>
        <View style={styles.planRow}>
          <IconCircle icon={style.icon} color={style.color} size={44} />
          <View style={styles.grow}>
            <AppText variant="small">{heading}</AppText>
            <AppText variant="heading">{plan.workoutTitle || plan.dayName}</AppText>
            <View style={styles.planMeta}>
              <Pill icon={style.icon} label={t(`dashboard.planTypes.${plan.planType}` as "dashboard.planTypes.workout")} color={style.color} />
              {summary ? (
                <AppText variant="small">
                  {t("mobile.calendar.counts", { meals: summary.mealCount, exercises: summary.exerciseCount })}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>
        <Button icon="arrow-forward" label={t("calendar.goToDayDetail")} onPress={() => router.push(`/day/${plan.id}`)} />
        {plan.weeklyPlanId ? (
          <View style={styles.buttonRow}>
            <Button
              icon="cart-outline"
              label={t("calendar.shoppingList")}
              variant="secondary"
              style={styles.grow}
              onPress={() => router.push({ pathname: "/shopping", params: { week: String(plan.weeklyPlanId) } })}
            />
            {canShare ? (
              <Button
                icon="people-outline"
                label={t("shareManager.shareButton")}
                variant="secondary"
                style={styles.grow}
                onPress={() => router.push({ pathname: "/share-week", params: { weeklyPlanId: String(plan.weeklyPlanId) } })}
              />
            ) : null}
          </View>
        ) : null}
      </Card>
      <DayLists dayId={plan.id} planType={plan.planType} readOnly={plan.date != null && plan.date < todayStr()} />
    </>
  );
}

type ListTab = "nutrition" | "workout";

/** The selected day's meals and workout right under the calendar, like the web (DayDetailPanel). Past days are view-only. */
function DayLists({ dayId, planType, readOnly }: { dayId: number; planType: string; readOnly: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const profile = useProfile();
  const meals = useDayMeals(dayId);
  const exercises = useDayExercises(dayId);
  const toggleMeal = useToggleMeal(dayId);
  const toggleExercise = useToggleExercise(dayId);
  const [tab, setTab] = useState<ListTab>("nutrition");
  const nutritionOnly = profile.data?.serviceType === "nutrition";
  const current: ListTab = nutritionOnly ? "nutrition" : tab;
  const id = String(dayId);
  const loading = current === "nutrition" ? meals.isLoading : exercises.isLoading;

  let content;
  if (loading) content = <ActivityIndicator color={colors.primary} />;
  else if (current === "nutrition") {
    const data = meals.data ?? [];
    content =
      data.length === 0 ? (
        <AppText variant="muted">{t("mobile.day.noMeals")}</AppText>
      ) : (
        data.map((meal) => (
          <MealItem
            key={meal.id}
            meal={meal}
            onToggle={readOnly ? undefined : (isCompleted) => toggleMeal.mutate({ id: meal.id, isCompleted })}
            onPress={readOnly ? undefined : () => router.push({ pathname: "/meal-form", params: { dayId: id, mealId: String(meal.id) } })}
            onAi={readOnly ? undefined : () => router.push({ pathname: "/ai/meal-variation", params: { dayId: id, mealId: String(meal.id) } })}
          />
        ))
      );
  } else {
    const data = exercises.data ?? [];
    content =
      data.length === 0 ? (
        <AppText variant="muted">{t(planType === "rest" ? "mobile.day.restDay" : "mobile.day.noExercises")}</AppText>
      ) : (
        <ExerciseSections
          exercises={data}
          onToggle={readOnly ? undefined : (exercise, isCompleted) => toggleExercise.mutate({ id: exercise.id, isCompleted })}
          onPress={
            readOnly
              ? undefined
              : (exercise) => router.push({ pathname: "/exercise-form", params: { dayId: id, exerciseId: String(exercise.id) } })
          }
          onAi={
            readOnly ? undefined : (exercise) => router.push({ pathname: "/ai/exercise", params: { dayId: id, exerciseId: String(exercise.id) } })
          }
        />
      );
  }

  return (
    <>
      {nutritionOnly ? null : (
        <Segmented
          options={[
            { value: "nutrition", label: t("day.tabs.nutrition") },
            { value: "workout", label: t("day.tabs.workout") },
          ]}
          value={current}
          onChange={setTab}
        />
      )}
      {content}
    </>
  );
}

const styles = StyleSheet.create({
  navRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  navTitle: { flex: 1, textAlign: "center" },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: { flexDirection: "row", gap: 2 },
  weekday: { flex: 1, textAlign: "center", textTransform: "capitalize" },
  cell: { flex: 1, aspectRatio: 0.85, maxHeight: 56 },
  cellButton: { alignItems: "center", justifyContent: "center", borderRadius: radius.sm, gap: 2 },
  cellSelected: { backgroundColor: colors.primary },
  cellToday: { backgroundColor: withAlpha(colors.primary, 0.15) },
  dayNumberToday: { color: colors.primary },
  dayNumber: { fontSize: 15, fontWeight: "600", fontVariant: ["tabular-nums"] },
  dayNumberSelected: { color: colors.primaryText },
  cellIcon: { height: 14, justifyContent: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  todayRow: { alignItems: "center" },
  planRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  planMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm, marginTop: 2 },
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  grow: { flex: 1, gap: 2 },
});
