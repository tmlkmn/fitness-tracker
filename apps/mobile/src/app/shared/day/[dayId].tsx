import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useLocale, useTranslations } from "use-intl";

import { ExerciseSections, MealItem } from "@/components/plan-items";
import { AppText, Banner, ErrorView, LoadingView, Screen, Segmented } from "@/components/ui";
import { useSharedDay, useSharedDayExercises, useSharedDayMeals } from "@/hooks/sharing";
import { colors } from "@/lib/theme";

type Tab = "nutrition" | "workout";

/** A day of a shared week, read-only (web: /paylasilan/gun/[dayId]). */
export default function SharedDayScreen() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const id = Number(useLocalSearchParams<{ dayId: string }>().dayId);
  const day = useSharedDay(id);
  const meals = useSharedDayMeals(id);
  const exercises = useSharedDayExercises(id);
  const [tab, setTab] = useState<Tab>("nutrition");
  const queries = [day, meals, exercises];
  const refetchAll = () => Promise.all(queries.map((q) => q.refetch()));

  if (queries.some((q) => q.isLoading)) return <LoadingView />;
  if (!day.data || !meals.data || !exercises.data) {
    return <ErrorView error={day.error ?? meals.error ?? exercises.error} onRetry={refetchAll} />;
  }

  const kind = day.data.workoutTitle ?? t(`dashboard.planTypes.${day.data.planType}`);
  return (
    <>
      <Stack.Screen options={{ title: day.data.dayName }} />
      <Screen onRefresh={refetchAll}>
        <AppText variant="muted">
          {day.data.date
            ? `${formatDate(parseDateOnly(day.data.date), locale, { weekday: "long", day: "numeric", month: "long" })} — ${kind}`
            : kind}
        </AppText>
        <Banner icon={<Ionicons name="eye-outline" size={16} color={colors.warning} />}>{t("sharing.readOnlyNotice")}</Banner>
        <Segmented
          options={[
            { value: "nutrition", label: t("day.tabs.nutrition") },
            { value: "workout", label: t("day.tabs.workout") },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "nutrition" && meals.data.length === 0 ? <AppText variant="muted">{t("sharing.noMeals")}</AppText> : null}
        {tab === "nutrition" ? meals.data.map((meal) => <MealItem key={meal.id} meal={meal} />) : null}
        {tab === "workout" && exercises.data.length === 0 ? <AppText variant="muted">{t("sharing.noWorkout")}</AppText> : null}
        {tab === "workout" ? <ExerciseSections exercises={exercises.data} /> : null}
      </Screen>
    </>
  );
}
