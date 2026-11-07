import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useTranslations } from "use-intl";

import {
  AchievementStrip,
  DailyRings,
  GreetingCard,
  NoPlanCard,
  QuickLinks,
  StatsRow,
  StreakCard,
  TodayPlanCard,
  WeekStrip,
} from "@/components/dashboard";
import { OfflineBanner } from "@/components/offline-banner";
import { ExerciseSections, MealItem } from "@/components/plan-items";
import { AppText, Card, ErrorView, LoadingView, Screen, SectionTitle } from "@/components/ui";
import { CardHeading } from "@/components/visual";
import { SleepTile, WaterTile } from "@/components/wellness";
import { useGreeting } from "@/hooks/ai";
import { useActivityStats } from "@/hooks/gamification";
import {
  useDaySupplements,
  useMacroTargets,
  useTodayDashboard,
  useToggleExercise,
  useToggleMeal,
  useToggleSupplement,
} from "@/hooks/plan";
import { useWeeks } from "@/hooks/shopping";
import { useProfile } from "@/hooks/wellness";
import { todayStr } from "@/lib/dates";
import { useSession } from "@/lib/session";
import { colors, spacing } from "@/lib/theme";

export default function TodayScreen() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useSession();
  const today = todayStr();
  const dashboard = useTodayDashboard();
  const greeting = useGreeting();
  const profile = useProfile();
  const weeks = useWeeks();
  const activity = useActivityStats();
  const day = dashboard.data?.dailyPlan ?? null;
  const dayId = day?.id ?? 0;
  const targets = useMacroTargets(day?.planType);
  const toggleMeal = useToggleMeal(dayId);
  const toggleExercise = useToggleExercise(dayId);

  if (dashboard.isLoading) return <LoadingView />;
  // An error, or offline with nothing saved on the device yet.
  if (!dashboard.data && (dashboard.error || dashboard.fetchStatus === "paused")) {
    return <ErrorView error={dashboard.error} onRetry={() => dashboard.refetch()} />;
  }

  const meals = dashboard.data?.meals ?? [];
  const exercises = dashboard.data?.exercises ?? [];
  const weeklyPlan = dashboard.data?.weeklyPlan ?? null;
  const firstName = user?.name?.split(" ")[0] ?? "";
  const nutritionOnly = profile.data?.serviceType === "nutrition";
  const counted = nutritionOnly ? meals : exercises;
  const todayPct = counted.length > 0 ? Math.round((counted.filter((x) => x.isCompleted).length / counted.length) * 100) : null;

  const refresh = () => {
    void dashboard.refetch();
    void activity.refetch();
    void profile.refetch();
  };

  return (
    <Screen refreshing={dashboard.isRefetching} onRefresh={refresh}>
      <OfflineBanner />
      <GreetingCard date={today} firstName={firstName} message={greeting.data?.message} profile={profile.data} />

      {day ? (
        <>
          <TodayPlanCard
            dayId={day.id}
            planType={day.planType}
            workoutTitle={day.workoutTitle}
            meals={meals}
            exercises={exercises}
            nutritionOnly={nutritionOnly}
          />
          <DailyRings meals={meals} exercises={exercises} targets={targets.data?.targets} nutritionOnly={nutritionOnly} />
        </>
      ) : (
        <NoPlanCard />
      )}

      <View style={styles.tiles}>
        <WaterTile date={today} />
        <SleepTile date={today} />
      </View>

      {day ? (
        <>
          <SectionTitle>
            <Ionicons name="restaurant" size={17} color={colors.primary} /> {t("mobile.today.meals")}
          </SectionTitle>
          {meals.length === 0 ? <AppText variant="muted">{t("mobile.day.noMeals")}</AppText> : null}
          {meals.map((meal) => (
            <MealItem
              key={meal.id}
              meal={meal}
              onToggle={(isCompleted) => toggleMeal.mutate({ id: meal.id, isCompleted })}
              onPress={() => router.push({ pathname: "/meal-form", params: { dayId: String(dayId), mealId: String(meal.id) } })}
              onAi={() => router.push({ pathname: "/ai/meal-variation", params: { dayId: String(dayId), mealId: String(meal.id) } })}
            />
          ))}

          {exercises.length > 0 ? (
            <>
              <SectionTitle>
                <Ionicons name="barbell" size={17} color={colors.primary} /> {t("mobile.today.workout")}
              </SectionTitle>
              <ExerciseSections
                exercises={exercises}
                onToggle={(exercise, isCompleted) => toggleExercise.mutate({ id: exercise.id, isCompleted })}
                onPress={(exercise) =>
                  router.push({ pathname: "/exercise-form", params: { dayId: String(dayId), exerciseId: String(exercise.id) } })
                }
                onAi={(exercise) =>
                  router.push({ pathname: "/ai/exercise", params: { dayId: String(dayId), exerciseId: String(exercise.id) } })
                }
              />
            </>
          ) : null}

          <Supplements dayId={day.id} date={today} />
        </>
      ) : null}

      {weeklyPlan ? <WeekStrip weeklyPlanId={weeklyPlan.id} weekTitle={weeklyPlan.title} today={today} /> : null}
      <StatsRow profile={profile.data} weeksCount={weeks.data?.length ?? 0} todayPct={todayPct} nutritionOnly={nutritionOnly} />
      {activity.data ? (
        <>
          <StreakCard stats={activity.data} />
          <AchievementStrip stats={activity.data} />
        </>
      ) : null}
      <QuickLinks weeklyPlanId={weeklyPlan?.id ?? null} />
    </Screen>
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
      <CardHeading icon="medkit-outline" title={t("supplements")} right={`${list.filter((s) => s.isCompleted).length}/${list.length}`} />
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
  tiles: { flexDirection: "row", gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  supplement: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  struck: { textDecorationLine: "line-through", color: colors.textMuted },
});
