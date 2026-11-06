import Ionicons from "@expo/vector-icons/Ionicons";
import type { DailyPlanDto } from "@fitmusc/shared/api/dto";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import type { UseQueryResult } from "@tanstack/react-query";
import { exerciseInputSchema, type ExerciseInputBody } from "@fitmusc/shared/api/schemas";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Alert } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { ExerciseSections, MacroSummary, MealItem } from "@/components/plan-items";
import { AppText, Banner, Button, Card, ErrorView, LoadingView, Screen, Segmented, useErrorMessage } from "@/components/ui";
import { SleepCard, WaterCard } from "@/components/wellness";
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
  const refresh = () => {
    void meals.refetch();
    void exercises.refetch();
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen refreshing={meals.isRefetching || exercises.isRefetching} onRefresh={refresh}>
        {readOnly ? (
          <Banner icon={<Ionicons name="lock-closed" size={14} color={colors.warning} />}>{t("day.pastDayBanner.title")}</Banner>
        ) : null}
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
  const add = readOnly ? null : (
    <Button label={`＋ ${t("meals.list.addMeal")}`} variant="secondary" onPress={() => router.push({ pathname: "/meal-form", params: { dayId: String(day.id) } })} />
  );
  return (
    <ListState query={meals} empty={t("mobile.day.noMeals")} emptyActions={add}>
      {(list) => (
        <>
          <Card>
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
            />
          ))}
          {add}
          {!readOnly && list.some((m) => !m.isCompleted) ? (
            <Button
              label={t("meals.list.completeAll")}
              variant="secondary"
              loading={completeAll.isPending}
              onPress={() => completeAll.mutate()}
            />
          ) : null}
        </>
      )}
    </ListState>
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
      label={`＋ ${t("workout.list.addExercise")}`}
      variant="secondary"
      onPress={() => router.push({ pathname: "/exercise-form", params: { dayId: String(day.id) } })}
    />
  );
  const emptyActions = readOnly ? null : (
    <>
      {add}
      <Button
        label={`↺ ${t("workout.list.fromLastWeek")}`}
        variant="ghost"
        loading={loadingPrevious || copy.isPending}
        onPress={copyLastWeek}
      />
    </>
  );
  return (
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
          />
          {add}
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
  );
}
