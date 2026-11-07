import Ionicons from "@expo/vector-icons/Ionicons";
import type { DailyPlanDto } from "@fitmusc/shared/api/dto";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import type { UseQueryResult } from "@tanstack/react-query";
import { exerciseInputSchema, type ExerciseInputBody } from "@fitmusc/shared/api/schemas";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { AiButton, JobBanner, MonthGateNotice } from "@/components/ai";
import { CalorieTrendCard } from "@/components/insights";
import { OfflineBanner } from "@/components/offline-banner";
import { ExerciseSections, MacroSummary, MealItem } from "@/components/plan-items";
import { planTypeStyle } from "@/components/plan-type";
import { AppText, Banner, Button, Card, ErrorView, LoadingView, Screen, Segmented, useErrorMessage } from "@/components/ui";
import { CardHeading, Pill } from "@/components/visual";
import { SleepCard, WaterCard } from "@/components/wellness";
import { useMonthGate } from "@/hooks/ai";
import { useCopyLastWeek } from "@/hooks/edit";
import { useCompleteAll, useDay, useDayExercises, useDayMeals, useMacroTargets, useToggleExercise, useToggleMeal } from "@/hooks/plan";
import { todayStr } from "@/lib/dates";
import { colors } from "@/lib/theme";

type Tab = "nutrition" | "workout" | "wellness";

export default function DayScreen() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const dayId = Number(useLocalSearchParams<{ dayId: string }>().dayId);
  const day = useDay(dayId);
  const meals = useDayMeals(dayId);
  const exercises = useDayExercises(dayId);
  const [tab, setTab] = useState<Tab>("nutrition");

  if (day.isLoading) return <LoadingView />;
  if (!day.data) return <ErrorView error={day.error} onRetry={() => day.refetch()} />;

  const date = day.data.date;
  const title = [day.data.dayName, date ? formatDate(parseDateOnly(date), locale, { day: "numeric", month: "long" }) : null]
    .filter(Boolean)
    .join(" · ");
  // Like the web: past days are view-only.
  const readOnly = date != null && date < todayStr();
  const tabs: { value: Tab; label: string }[] = [
    { value: "nutrition", label: t("day.tabs.nutrition") },
    { value: "workout", label: t("day.tabs.workout") },
    ...(date ? [{ value: "wellness" as const, label: t("day.tabs.wellness") }] : []),
  ];
  const refresh = () => Promise.all([meals.refetch(), exercises.refetch()]);

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen onRefresh={refresh}>
        <OfflineBanner />
        {readOnly ? (
          <Banner icon={<Ionicons name="lock-closed" size={14} color={colors.warning} />}>{t("day.pastDayBanner.title")}</Banner>
        ) : null}
        <View style={styles.dayHead}>
          <Pill
            icon={planTypeStyle(day.data.planType).icon}
            label={t(`dashboard.planTypes.${day.data.planType}` as "dashboard.planTypes.workout")}
            color={planTypeStyle(day.data.planType).color}
          />
          {day.data.workoutTitle ? (
            <AppText variant="muted" style={styles.grow} numberOfLines={2}>
              {day.data.workoutTitle}
            </AppText>
          ) : null}
        </View>
        <Segmented options={tabs} value={tab} onChange={setTab} />
        {tab === "nutrition" ? <NutritionTab day={day.data} meals={meals} readOnly={readOnly} /> : null}
        {tab === "workout" ? <WorkoutTab day={day.data} exercises={exercises} readOnly={readOnly} /> : null}
        {tab === "wellness" && date ? (
          <>
            <WaterCard date={date} readOnly={readOnly} />
            <SleepCard date={date} readOnly={readOnly} />
          </>
        ) : null}
      </Screen>
    </>
  );
}

/** The day's "AI ile oluştur / değiştir" button — or, while the month gate is closed (web rule), why not. */
function AiEntry({
  date,
  label,
  feature,
  primary,
  onPress,
}: {
  date: string | null;
  label: string;
  feature: "daily-meal" | "workout";
  primary: boolean;
  onPress: () => void;
}) {
  const monthGate = useMonthGate();
  if (date != null && monthGate.isBlocked(date)) return <MonthGateNotice emptyWeekCount={monthGate.emptyWeekCount} />;
  return <AiButton label={label} feature={feature} variant={primary ? "primary" : "secondary"} onPress={onPress} />;
}

/** Loading / error / empty states shared by both list tabs. */
function ListState<T>({
  query,
  empty,
  emptyActions,
  children,
}: {
  query: UseQueryResult<T[]>;
  empty: string;
  emptyActions?: ReactNode;
  children: (list: T[]) => ReactNode;
}) {
  if (query.isLoading) return <LoadingView />;
  if (!query.data) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.length === 0) {
    return (
      <>
        <AppText variant="muted">{empty}</AppText>
        {emptyActions}
      </>
    );
  }
  return <>{children(query.data)}</>;
}

function NutritionTab({
  day,
  meals,
  readOnly,
}: {
  day: DailyPlanDto;
  meals: ReturnType<typeof useDayMeals>;
  readOnly: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const targets = useMacroTargets(day.planType);
  const toggle = useToggleMeal(day.id);
  const completeAll = useCompleteAll(day.id, "meals");
  const hasMeals = (meals.data?.length ?? 0) > 0;
  const add = readOnly ? null : (
    <Button icon="add" label={t("meals.list.addMeal")} variant="secondary" onPress={() => router.push({ pathname: "/meal-form", params: { dayId: String(day.id) } })} />
  );
  const ai = readOnly ? null : (
    <AiEntry
      date={day.date}
      label={t(hasMeals ? "meals.list.changeWithAI" : "meals.list.generateWithAI")}
      feature="daily-meal"
      primary={!hasMeals}
      onPress={() => router.push({ pathname: "/ai/day-meals", params: { dayId: String(day.id) } })}
    />
  );
  return (
    <>
      <JobBanner kind="daily-meals" belongs={(job) => job.kind === "daily-meals" && job.input.dailyPlanId === day.id} />
      <ListState
        query={meals}
        empty={t("mobile.day.noMeals")}
        emptyActions={
          <>
            {ai}
            {add}
          </>
        }
      >
        {(list) => (
          <>
            <Card>
              <CardHeading
                icon="pie-chart-outline"
                title={t("mobile.today.macros")}
                right={`${list.filter((m) => m.isCompleted).length}/${list.length}`}
              />
              <MacroSummary meals={list} targets={targets.data?.targets} />
            </Card>
            {list.map((meal) => (
              <MealItem
                key={meal.id}
                meal={meal}
                onToggle={readOnly ? undefined : (isCompleted) => toggle.mutate({ id: meal.id, isCompleted })}
                onPress={
                  readOnly
                    ? undefined
                    : () => router.push({ pathname: "/meal-form", params: { dayId: String(day.id), mealId: String(meal.id) } })
                }
                onAi={
                  readOnly
                    ? undefined
                    : () => router.push({ pathname: "/ai/meal-variation", params: { dayId: String(day.id), mealId: String(meal.id) } })
                }
              />
            ))}
            {add}
            {ai}
            {!readOnly && list.some((m) => !m.isCompleted) ? (
              <Button
                label={t("meals.list.completeAll")}
                variant="secondary"
                loading={completeAll.isPending}
                onPress={() => completeAll.mutate()}
              />
            ) : null}
            <CalorieTrendCard endDate={day.date ?? todayStr()} planType={day.planType} />
          </>
        )}
      </ListState>
    </>
  );
}

function WorkoutTab({
  day,
  exercises,
  readOnly,
}: {
  day: DailyPlanDto;
  exercises: ReturnType<typeof useDayExercises>;
  readOnly: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const toggle = useToggleExercise(day.id);
  const completeAll = useCompleteAll(day.id, "exercises");
  const { copy, fetchPrevious } = useCopyLastWeek(day.id);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const hasExercises = (exercises.data?.length ?? 0) > 0;

  const copyLastWeek = async () => {
    setLoadingPrevious(true);
    try {
      const previous = await fetchPrevious();
      // Same rules as a manual add; rows the schema rejects are skipped.
      const items = previous.flatMap((e): ExerciseInputBody[] => {
        const parsed = exerciseInputSchema.safeParse(e);
        return parsed.success ? [parsed.data] : [];
      });
      if (items.length === 0) return Alert.alert(t("workout.list.fromLastWeek"), t("mobile.day.copyLastWeekEmpty"));
      Alert.alert(t("workout.list.copyFromLastWeek"), t("mobile.day.copyLastWeekConfirm", { count: items.length }), [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.confirm"),
          onPress: () => copy.mutate(items, { onError: (err) => Alert.alert(t("workout.list.fromLastWeek"), errorMessage(err)) }),
        },
      ]);
    } catch (err) {
      Alert.alert(t("workout.list.fromLastWeek"), errorMessage(err));
    } finally {
      setLoadingPrevious(false);
    }
  };

  const add = readOnly ? null : (
    <Button
      icon="add"
      label={t("workout.list.addExercise")}
      variant="secondary"
      onPress={() => router.push({ pathname: "/exercise-form", params: { dayId: String(day.id) } })}
    />
  );
  const ai = readOnly ? null : (
    <AiEntry
      date={day.date}
      label={t(hasExercises ? "workout.list.changeWithAI" : "workout.list.generateWithAI")}
      feature="workout"
      primary={!hasExercises}
      onPress={() => router.push({ pathname: "/ai/workout", params: { dayId: String(day.id) } })}
    />
  );
  const emptyActions = readOnly ? null : (
    <>
      {ai}
      {add}
      <Button
        icon="refresh"
        label={t("workout.list.fromLastWeek")}
        variant="ghost"
        loading={loadingPrevious || copy.isPending}
        onPress={copyLastWeek}
      />
    </>
  );
  return (
    <>
      <JobBanner kind="workout" belongs={(job) => job.kind === "workout" && job.input.dailyPlanId === day.id} />
      <ListState
        query={exercises}
        empty={t(day.planType === "rest" ? "mobile.day.restDay" : "mobile.day.noExercises")}
        emptyActions={emptyActions}
      >
        {(list) => (
          <>
            <ExerciseSections
              exercises={list}
              onToggle={readOnly ? undefined : (exercise, isCompleted) => toggle.mutate({ id: exercise.id, isCompleted })}
              onPress={
                readOnly
                  ? undefined
                  : (exercise) =>
                      router.push({ pathname: "/exercise-form", params: { dayId: String(day.id), exerciseId: String(exercise.id) } })
              }
              onAi={
                readOnly
                  ? undefined
                  : (exercise) =>
                      router.push({ pathname: "/ai/exercise", params: { dayId: String(day.id), exerciseId: String(exercise.id) } })
              }
              onSectionAi={
                readOnly ? undefined : (section) => router.push({ pathname: "/ai/workout", params: { dayId: String(day.id), section } })
              }
            />
            {add}
            {ai}
            {!readOnly && list.some((e) => !e.isCompleted) ? (
              <Button
                label={t("workout.list.completeAll")}
                variant="secondary"
                loading={completeAll.isPending}
                onPress={() => completeAll.mutate()}
              />
            ) : null}
          </>
        )}
      </ListState>
    </>
  );
}

const styles = StyleSheet.create({
  dayHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  grow: { flex: 1 },
});
