import Ionicons from "@expo/vector-icons/Ionicons";
import { formatDate, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { ExerciseSections, MacroSummary, MealItem } from "@/components/plan-items";
import { AppText, Button, Card, ErrorView, LoadingView, ProgressBar, Screen, SectionTitle } from "@/components/ui";
import { SleepCard, WaterCard } from "@/components/wellness";
import {
  useDaySupplements,
  useMacroTargets,
  useTodayDashboard,
  useToggleExercise,
  useToggleMeal,
  useToggleSupplement,
} from "@/hooks/plan";
import { todayStr } from "@/lib/dates";
import { useSession } from "@/lib/session";
import { colors, spacing } from "@/lib/theme";

export default function TodayScreen() {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { user } = useSession();
  const today = todayStr();
  const dashboard = useTodayDashboard();
  const day = dashboard.data?.dailyPlan ?? null;
  const dayId = day?.id ?? 0;
  const targets = useMacroTargets(day?.planType);
  const toggleMeal = useToggleMeal(dayId);
  const toggleExercise = useToggleExercise(dayId);

  if (dashboard.isLoading) return <LoadingView />;
  if (dashboard.error && !dashboard.data) return <ErrorView error={dashboard.error} onRetry={() => dashboard.refetch()} />;

  const meals = dashboard.data?.meals ?? [];
  const exercises = dashboard.data?.exercises ?? [];
  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <Screen refreshing={dashboard.isRefetching} onRefresh={() => dashboard.refetch()}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="muted">{formatDate(parseDateOnly(today), locale, { weekday: "long", day: "numeric", month: "long" })}</AppText>
        {firstName ? <AppText variant="heading">{t("dashboard.welcome", { name: firstName })}</AppText> : null}
      </View>

      {!day ? (
        <Card>
          <AppText variant="heading">{t("dashboard.noPlanToday")}</AppText>
          <AppText variant="muted">{t("mobile.today.noPlanHint")}</AppText>
        </Card>
      ) : (
        <>
          <Pressable onPress={() => router.push(`/day/${day.id}`)} accessibilityRole="button">
            {({ pressed }) => (
              <Card style={pressed && { backgroundColor: colors.cardPressed }}>
                <View style={styles.planHeader}>
                  <View style={styles.grow}>
                    <AppText variant="small">{t(`dashboard.planTypes.${day.planType}`)}</AppText>
                    <AppText variant="heading">{day.workoutTitle || t("dashboard.todayPlan")}</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
                <Progress label={t("mobile.today.meals")} done={meals.filter((m) => m.isCompleted).length} total={meals.length} />
                {exercises.length > 0 ? (
                  <Progress
                    label={t("mobile.today.workout")}
                    done={exercises.filter((e) => e.isCompleted).length}
                    total={exercises.length}
                  />
                ) : null}
              </Card>
            )}
          </Pressable>

          {meals.length > 0 ? (
            <Card>
              <AppText variant="heading">{t("mobile.today.macros")}</AppText>
              <MacroSummary meals={meals} targets={targets.data?.targets} />
            </Card>
          ) : null}

          <SectionTitle>{t("mobile.today.meals")}</SectionTitle>
          {meals.length === 0 ? <AppText variant="muted">{t("mobile.day.noMeals")}</AppText> : null}
          {meals.map((meal) => (
            <MealItem key={meal.id} meal={meal} onToggle={(isCompleted) => toggleMeal.mutate({ id: meal.id, isCompleted })} />
          ))}

          {exercises.length > 0 ? (
            <>
              <SectionTitle>{t("mobile.today.workout")}</SectionTitle>
              <ExerciseSections
                exercises={exercises}
                onToggle={(exercise, isCompleted) => toggleExercise.mutate({ id: exercise.id, isCompleted })}
              />
            </>
          ) : null}

          <Supplements dayId={day.id} date={today} />
        </>
      )}

      <WaterCard date={today} />
      <SleepCard date={today} />

      {day ? <Button label={t("mobile.today.openDay")} variant="secondary" onPress={() => router.push(`/day/${day.id}`)} /> : null}
      {dashboard.data?.weeklyPlan ? (
        <Button
          label={`🛒 ${t("calendar.shoppingList")}`}
          variant="secondary"
          onPress={() => router.push({ pathname: "/shopping", params: { week: String(dashboard.data?.weeklyPlan?.id) } })}
        />
      ) : null}
    </Screen>
  );
}

function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.progressRow}>
        <AppText variant="muted">{label}</AppText>
        <AppText variant="small">
          {done}/{total}
        </AppText>
      </View>
      <ProgressBar value={done} max={total} />
    </View>
  );
}

function Supplements({ dayId, date }: { dayId: number; date: string }) {
  const t = useTranslations("mobile.today");
  const supplements = useDaySupplements(dayId);
  const toggle = useToggleSupplement(dayId, date);
  const list = supplements.data ?? [];
  if (list.length === 0) return null;
  return (
    <Card>
      <AppText variant="heading">💊 {t("supplements")}</AppText>
      {list.map((s) => (
        <Pressable
          key={s.id}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: s.isCompleted }}
          onPress={() => toggle.mutate({ id: s.id, completed: !s.isCompleted })}
          style={styles.supplement}
        >
          <Ionicons
            name={s.isCompleted ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={s.isCompleted ? colors.primary : colors.textMuted}
          />
          <View style={styles.grow}>
            <AppText style={s.isCompleted && styles.struck}>{s.name}</AppText>
            <AppText variant="small">{[s.dosage, s.timing].filter(Boolean).join(" · ")}</AppText>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  planHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  progressRow: { flexDirection: "row", justifyContent: "space-between" },
  supplement: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  struck: { textDecorationLine: "line-through", color: colors.textMuted },
});
