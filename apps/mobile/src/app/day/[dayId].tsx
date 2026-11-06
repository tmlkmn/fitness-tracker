import Ionicons from "@expo/vector-icons/Ionicons";
import type { DailyPlanDto } from "@fitmusc/shared/api/dto";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import type { UseQueryResult } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "use-intl";

import { ExerciseSections, MacroSummary, MealItem } from "@/components/plan-items";
import { AppText, Banner, Button, Card, ErrorView, LoadingView, Screen, Segmented } from "@/components/ui";
import { SleepCard, WaterCard } from "@/components/wellness";
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
function ListState<T>({ query, empty, children }: { query: UseQueryResult<T[]>; empty: string; children: (list: T[]) => ReactNode }) {
  if (query.isLoading) return <LoadingView />;
  if (!query.data) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.length === 0) return <AppText variant="muted">{empty}</AppText>;
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
  const targets = useMacroTargets(day.planType);
  const toggle = useToggleMeal(day.id);
  const completeAll = useCompleteAll(day.id, "meals");
  return (
    <ListState query={meals} empty={t("mobile.day.noMeals")}>
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
            />
          ))}
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
  const toggle = useToggleExercise(day.id);
  const completeAll = useCompleteAll(day.id, "exercises");
  return (
    <ListState query={exercises} empty={t(day.planType === "rest" ? "mobile.day.restDay" : "mobile.day.noExercises")}>
      {(list) => (
        <>
          <ExerciseSections
            exercises={list}
            onToggle={readOnly ? undefined : (exercise, isCompleted) => toggle.mutate({ id: exercise.id, isCompleted })}
          />
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
