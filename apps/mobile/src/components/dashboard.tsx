import Ionicons from "@expo/vector-icons/Ionicons";
import { ACHIEVEMENTS } from "@fitmusc/shared/achievements";
import type { ActivityStatsDto, ExerciseDto, MacroTargetsDto, MealDto, UserProfileDto } from "@fitmusc/shared/api/dto";
import { formatDate, intlLocale, parseDateOnly } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { computeMealMacros } from "@fitmusc/shared/meal-macros";
import { useRouter, type Href } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { useDaySummaries } from "@/hooks/calendar";
import { useFriendStreaks } from "@/hooks/gamification";
import { accents, colors, radius, spacing, withAlpha } from "@/lib/theme";

import { PlanTypeIcon, planTypeStyle } from "./plan-type";
import { AppText, Button, Card, ProgressBar } from "./ui";
import { CardHeading, IconCircle, MultiRing, Pill, StatTile, type IconName } from "./visual";

function useNumber() {
  const locale = useLocale() as Locale;
  const format = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1 });
  return (value: string | number | null | undefined): string | null => {
    const n = typeof value === "string" ? Number.parseFloat(value) : value;
    return n == null || Number.isNaN(n) ? null : format.format(n);
  };
}

// ── Greeting ────────────────────────────────────────────────────────────────

/** `today` is the screen's `YYYY-MM-DD`, so render stays pure. */
function useMembership(profile: UserProfileDto | undefined, today: string): { label: string; color: string } | null {
  const t = useTranslations("dashboard");
  if (!profile?.membershipType) return null;
  if (profile.membershipType === "unlimited") return { label: t("membershipUnlimited"), color: colors.primary };
  if (!profile.membershipEndDate) return null;
  const days = Math.ceil((new Date(profile.membershipEndDate).getTime() - parseDateOnly(today).getTime()) / 86_400_000);
  if (days < 0) return { label: t("membershipExpired"), color: colors.danger };
  return { label: t("membershipDays", { days }), color: colors.textMuted };
}

/** Tinted hello card: date, name, the AI greeting, body numbers and membership. */
export function GreetingCard({
  date,
  firstName,
  message,
  profile,
}: {
  date: string;
  firstName: string;
  message: string | null | undefined;
  profile: UserProfileDto | undefined;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale() as Locale;
  const num = useNumber();
  const membership = useMembership(profile, date);
  const height = profile?.height ? `${profile.height} cm` : null;
  const weight = num(profile?.weight);
  const target = num(profile?.targetWeight);
  const body = [height, weight ? `${weight} kg` : null, target ? t("weightTarget", { weight: target }) : null].filter(Boolean);

  return (
    <View style={styles.greeting}>
      <View style={styles.greetingTop}>
        <AppText variant="small" style={styles.grow}>
          {formatDate(parseDateOnly(date), locale, { weekday: "long", day: "numeric", month: "long" })}
        </AppText>
        {membership ? <Pill icon="card-outline" label={membership.label} color={membership.color} /> : null}
      </View>
      {firstName ? <AppText style={styles.hello}>{t("welcome", { name: firstName })}</AppText> : null}
      {message ? <AppText variant="muted">{message}</AppText> : null}
      {body.length > 0 ? <AppText variant="small">{body.join(" · ")}</AppText> : null}
    </View>
  );
}

// ── Today's plan ────────────────────────────────────────────────────────────

function ProgressRow({ icon, label, done, total }: { icon: IconName; label: string; done: number; total: number }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.progressRow}>
        <Ionicons name={icon} size={14} color={colors.textMuted} />
        <AppText variant="muted" style={styles.grow}>
          {label}
        </AppText>
        <AppText variant="small" style={styles.tabular}>
          {done}/{total}
        </AppText>
      </View>
      <ProgressBar value={done} max={total} />
    </View>
  );
}

export function TodayPlanCard({
  dayId,
  planType,
  workoutTitle,
  meals,
  exercises,
  nutritionOnly,
}: {
  dayId: number;
  planType: string;
  workoutTitle: string | null;
  meals: MealDto[];
  exercises: ExerciseDto[];
  nutritionOnly: boolean;
}) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const style = planTypeStyle(planType);
  return (
    <Card>
      <CardHeading
        icon="today-outline"
        title={t("todayPlan")}
        right={<Pill icon={style.icon} label={t(`planTypes.${planType}` as "planTypes.workout")} color={style.color} />}
      />
      {workoutTitle ? <AppText variant="muted">{workoutTitle}</AppText> : null}
      <ProgressRow icon="restaurant-outline" label={t("meals")} done={meals.filter((m) => m.isCompleted).length} total={meals.length} />
      {!nutritionOnly && exercises.length > 0 ? (
        <ProgressRow
          icon="barbell-outline"
          label={t("exercises")}
          done={exercises.filter((e) => e.isCompleted).length}
          total={exercises.length}
        />
      ) : null}
      <Button label={t("goToTodayPlan")} onPress={() => router.push(`/day/${dayId}`)} />
    </Card>
  );
}

export function NoPlanCard() {
  const t = useTranslations();
  const router = useRouter();
  return (
    <Card>
      <CardHeading icon="today-outline" title={t("dashboard.todayPlan")} />
      <AppText>{t("dashboard.noPlanToday")}</AppText>
      <AppText variant="muted">{t("mobile.today.noPlanHint")}</AppText>
      <Button label={t("dashboard.goToCalendar")} variant="secondary" onPress={() => router.push("/calendar")} />
    </Card>
  );
}

// ── Daily rings ─────────────────────────────────────────────────────────────

function RingLegend({
  icon,
  color,
  label,
  value,
  target,
  unit,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = target > 0 ? Math.round((value / target) * 100) : null;
  return (
    <View style={styles.legend}>
      <Ionicons name={icon} size={16} color={color} />
      <View style={styles.grow}>
        <AppText variant="small">{label}</AppText>
        <AppText style={styles.legendValue}>
          {value}
          <AppText variant="small">
            {target > 0 ? ` / ${target}` : ""}
            {unit ? ` ${unit}` : ""}
            {pct != null ? `  ·  ${pct}%` : ""}
          </AppText>
        </AppText>
      </View>
    </View>
  );
}

/**
 * Calories and protein from the meals ticked as eaten, and the day's tasks —
 * the rings fill as the day is ticked off. Carbs and fat sit underneath.
 */
export function DailyRings({
  meals,
  exercises,
  targets,
  nutritionOnly,
}: {
  meals: MealDto[];
  exercises: ExerciseDto[];
  targets: MacroTargetsDto | null | undefined;
  nutritionOnly: boolean;
}) {
  const t = useTranslations();
  const eaten = computeMealMacros(meals.filter((m) => m.isCompleted));
  const tasksDone = meals.filter((m) => m.isCompleted).length + (nutritionOnly ? 0 : exercises.filter((e) => e.isCompleted).length);
  const tasksTotal = meals.length + (nutritionOnly ? 0 : exercises.length);
  const kcal = Math.round(targets?.calories ?? 0);
  const protein = Math.round(targets?.protein ?? 0);
  if (kcal === 0 && protein === 0 && tasksTotal === 0) return null;
  const pct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  const carbs = Math.round(targets?.carbs ?? 0);
  const fat = Math.round(targets?.fat ?? 0);

  return (
    <Card>
      <View style={styles.rings}>
        <MultiRing
          size={124}
          rings={[
            { value: eaten.calories, max: kcal, color: accents.orange },
            { value: eaten.protein, max: protein, color: accents.sky },
            { value: tasksDone, max: tasksTotal, color: colors.primary },
          ]}
        >
          <AppText style={styles.ringPct}>{pct}%</AppText>
          <AppText variant="small">{t("meals.rings.completedShort")}</AppText>
        </MultiRing>
        <View style={[styles.grow, { gap: spacing.md }]}>
          <RingLegend icon="flame" color={accents.orange} label={t("meals.rings.calorie")} value={eaten.calories} target={kcal} unit="kcal" />
          <RingLegend icon="egg" color={accents.sky} label={t("meals.rings.protein")} value={eaten.protein} target={protein} unit="g" />
          <RingLegend icon="checkmark-circle" color={colors.primary} label={t("meals.rings.tasks")} value={tasksDone} target={tasksTotal} unit="" />
        </View>
      </View>
      {carbs > 0 || fat > 0 ? (
        <AppText variant="small" style={styles.center}>
          {t("meals.macroSummary.carbs")} {eaten.carbs} / {carbs} g  ·  {t("meals.macroSummary.fat")} {eaten.fat} / {fat} g
        </AppText>
      ) : null}
    </Card>
  );
}

// ── This week ───────────────────────────────────────────────────────────────

export function WeekStrip({ weeklyPlanId, weekTitle, today }: { weeklyPlanId: number; weekTitle: string; today: string }) {
  const t = useTranslations("dashboard");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const summaries = useDaySummaries(weeklyPlanId);
  const days = [...(summaries.data ?? [])].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.dayOfWeek - b.dayOfWeek);
  if (days.length === 0) return null;

  return (
    <Card>
      <CardHeading icon="calendar-outline" title={t("thisWeek")} right={weekTitle || undefined} />
      <View style={styles.week}>
        {days.map((day) => {
          const isToday = day.date === today;
          const style = planTypeStyle(day.planType);
          const date = day.date ? parseDateOnly(day.date) : null;
          return (
            <Pressable
              key={day.id}
              accessibilityRole="button"
              accessibilityLabel={`${day.dayName}, ${t(`planTypes.${day.planType}` as "planTypes.workout")}`}
              accessibilityState={{ selected: isToday }}
              onPress={() => router.push(`/day/${day.id}`)}
              style={({ pressed }) => [styles.weekDay, isToday && styles.weekDayToday, pressed && { backgroundColor: colors.cardPressed }]}
            >
              <AppText variant="small" style={isToday && { color: colors.primary, fontWeight: "600" }}>
                {date ? formatDate(date, locale, { weekday: "short" }) : day.dayName.slice(0, 3)}
              </AppText>
              <View style={[styles.weekIcon, { backgroundColor: withAlpha(style.color, isToday ? 0.3 : 0.15) }]}>
                <PlanTypeIcon planType={day.planType} size={16} />
              </View>
              <AppText variant="small" style={[styles.tabular, isToday && { color: colors.text }]}>
                {date ? date.getDate() : ""}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

// ── Stats row ───────────────────────────────────────────────────────────────

export function StatsRow({
  profile,
  weeksCount,
  todayPct,
  nutritionOnly,
}: {
  profile: UserProfileDto | undefined;
  weeksCount: number;
  todayPct: number | null;
  nutritionOnly: boolean;
}) {
  const t = useTranslations("dashboard");
  const num = useNumber();
  return (
    <Card style={styles.stats}>
      <StatTile icon="scale-outline" label={t("currentWeight")} value={num(profile?.weight) ?? "—"} unit="kg" />
      <View style={styles.divider} />
      <StatTile icon="flag-outline" label={t("target")} value={num(profile?.targetWeight) ?? "—"} unit="kg" accent={colors.primary} />
      <View style={styles.divider} />
      <StatTile icon="calendar-outline" label={t("program")} value={String(weeksCount)} unit={t("weeks")} />
      <View style={styles.divider} />
      <StatTile
        icon={nutritionOnly ? "restaurant-outline" : "barbell-outline"}
        label={t("today")}
        value={todayPct == null ? "—" : `${todayPct}%`}
      />
    </Card>
  );
}

// ── Streak and badges ───────────────────────────────────────────────────────

export function StreakCard({ stats }: { stats: ActivityStatsDto }) {
  const t = useTranslations("gamification.streak");
  const { currentStreak: current, longestStreak: longest } = stats;
  const flame = current === 0 ? colors.textMuted : current < 7 ? accents.orangeLight : current < 30 ? accents.amber : accents.red;
  return (
    <Card>
      <View style={styles.streak}>
        <IconCircle icon="flame" color={flame} size={44} />
        <View style={[styles.grow, { gap: spacing.xs }]}>
          {current === 0 ? (
            <>
              <AppText variant="heading">{t("noStreak")}</AppText>
              <AppText variant="small">{t("noStreakHint")}</AppText>
            </>
          ) : (
            <>
              <AppText variant="heading">{t("daysInARow", { count: current })}</AppText>
              <View style={styles.progressRow}>
                <View style={styles.grow}>
                  <ProgressBar value={current} max={Math.max(longest, current)} color={flame} />
                </View>
                <AppText variant="small">{t("longest", { days: longest })}</AppText>
              </View>
            </>
          )}
        </View>
      </View>
    </Card>
  );
}

// Lucide names in the shared list → Ionicons.
const BADGE_ICONS: Record<string, IconName> = {
  Footprints: "footsteps",
  Zap: "flash",
  Shield: "shield-checkmark",
  Sword: "shield-half",
  Crown: "ribbon",
  Trophy: "trophy",
  Star: "star",
  Medal: "medal",
  Gem: "diamond",
  Sparkles: "sparkles",
  Dumbbell: "barbell",
  Flame: "flame",
  HeartPulse: "pulse",
  Utensils: "restaurant",
  ChefHat: "fast-food",
};

export function AchievementStrip({ stats }: { stats: ActivityStatsDto }) {
  const t = useTranslations("gamification.achievements");
  const unlocked = new Set(ACHIEVEMENTS.filter((a) => a.check(stats)).map((a) => a.id));
  const show = (id: string) => {
    const title = t(`items.${id}.title` as "items.first-day.title");
    const body = t(`items.${id}.description` as "items.first-day.description");
    Alert.alert(title, `${body}\n\n${unlocked.has(id) ? t("earned") : t("locked")}`);
  };
  return (
    <Card>
      <CardHeading
        icon="trophy"
        title={t("title")}
        right={t("unlockedCount", { unlocked: unlocked.size, total: ACHIEVEMENTS.length })}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badges}>
        {ACHIEVEMENTS.map((a) => {
          const on = unlocked.has(a.id);
          return (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              accessibilityLabel={`${t(`items.${a.id}.title` as "items.first-day.title")}, ${on ? t("earned") : t("locked")}`}
              onPress={() => show(a.id)}
              style={({ pressed }) => [styles.badge, !on && styles.badgeLocked, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name={BADGE_ICONS[a.icon] ?? "star"} size={22} color={on ? colors.primary : colors.textMuted} />
              {on ? null : (
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </Card>
  );
}

// ── Friends ─────────────────────────────────────────────────────────────────

// Gold, silver, bronze for the top three.
const MEDALS = [accents.amber, "#cbd5e1", accents.orangeLight];

function flameColor(streak: number) {
  if (streak === 0) return colors.textMuted;
  if (streak < 7) return accents.orangeLight;
  if (streak < 30) return accents.amber;
  return accents.red;
}

/** The user and the people they share plans with, ranked by streak (web: FriendStreakCard). */
export function FriendStreakCard() {
  const t = useTranslations("gamification.friend");
  const streaks = useFriendStreaks();
  const rows = streaks.data ?? [];
  if (rows.length === 0) return null;
  const top = rows[0]?.currentStreak ?? 0;
  const me = rows.find((r) => r.isMe);
  return (
    <Card style={{ gap: spacing.sm }}>
      <CardHeading icon="people" color={colors.textMuted} title={t("title")} />
      {rows.map((row, i) => (
        <View key={row.userId} style={[styles.friend, row.isMe && styles.friendMe]}>
          <View style={styles.rank}>
            {i < 3 ? (
              <Ionicons name="trophy" size={15} color={MEDALS[i]} />
            ) : (
              <AppText variant="small" style={styles.tabular}>
                {i + 1}
              </AppText>
            )}
          </View>
          <AppText style={[styles.grow, row.isMe && { fontWeight: "700" }]} numberOfLines={1}>
            {row.isMe ? t("you") : row.name}
          </AppText>
          {i === 0 && row.isMe && row.currentStreak > 0 ? <Pill label={t("leader")} color={accents.amber} /> : null}
          {row.currentStreak > 0 ? (
            <View style={styles.flame}>
              <Ionicons name="flame" size={15} color={flameColor(row.currentStreak)} />
              <AppText style={[styles.legendValue, styles.tabular]}>{row.currentStreak}</AppText>
            </View>
          ) : (
            <AppText variant="small">—</AppText>
          )}
        </View>
      ))}
      {top > 0 && me?.currentStreak === 0 ? (
        <AppText variant="small" style={styles.center}>
          {t("catchUp")}
        </AppText>
      ) : null}
    </Card>
  );
}

// ── Profile prompt ──────────────────────────────────────────────────────────

/** Height, weight or target missing: the plans and AI need them. Opens the profile form. */
export function ProfileIncompleteCard({ profile }: { profile: UserProfileDto | undefined }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  if (!profile || (profile.height && profile.weight && profile.targetWeight)) return null;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push("/profile")}>
      {({ pressed }) => (
        <View style={[styles.prompt, pressed && { opacity: 0.7 }]}>
          <IconCircle icon="alert-circle" color={colors.warning} size={36} />
          <View style={styles.grow}>
            <AppText style={styles.linkTitle}>{t("completeProfile")}</AppText>
            <AppText variant="small">{t("completeProfileDesc")}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

// ── Quick links ─────────────────────────────────────────────────────────────

function LinkRow({ icon, title, subtitle, href }: { icon: IconName; title: string; subtitle: string; href: Href }) {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(href)}>
      {({ pressed }) => (
        <View style={[styles.link, pressed && { opacity: 0.6 }]}>
          <IconCircle icon={icon} color={colors.primary} size={36} />
          <View style={styles.grow}>
            <AppText style={styles.linkTitle}>{title}</AppText>
            <AppText variant="small">{subtitle}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      )}
    </Pressable>
  );
}

export function QuickLinks({ weeklyPlanId }: { weeklyPlanId: number | null }) {
  const t = useTranslations("dashboard.quickAccess");
  return (
    <Card style={{ gap: spacing.xs }}>
      {weeklyPlanId ? (
        <LinkRow
          icon="cart-outline"
          title={t("shopping")}
          subtitle={t("shoppingDesc")}
          href={{ pathname: "/shopping", params: { week: String(weeklyPlanId) } }}
        />
      ) : null}
      <LinkRow icon="people-outline" title={t("shared")} subtitle={t("sharedDesc")} href="/sharing" />
    </Card>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  center: { textAlign: "center" },
  tabular: { fontVariant: ["tabular-nums"] },
  greeting: {
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    backgroundColor: withAlpha(colors.primary, 0.08),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.primary, 0.35),
  },
  greetingTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hello: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rings: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  ringPct: { fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] },
  legend: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  legendValue: { fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  week: { flexDirection: "row", gap: 2 },
  weekDay: { flex: 1, alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.sm },
  weekDayToday: { backgroundColor: withAlpha(colors.primary, 0.12), borderWidth: 1, borderColor: withAlpha(colors.primary, 0.4) },
  weekIcon: { width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: 0 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: colors.border },
  streak: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badges: { gap: spacing.sm, paddingVertical: 2 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha(colors.primary, 0.15),
  },
  badgeLocked: { backgroundColor: colors.cardPressed },
  lock: { position: "absolute", right: 0, bottom: 0, backgroundColor: colors.card, borderRadius: radius.full, padding: 2 },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  friend: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.sm },
  friendMe: { backgroundColor: withAlpha(colors.primary, 0.1), borderWidth: 1, borderColor: withAlpha(colors.primary, 0.3) },
  rank: { width: 20, alignItems: "center" },
  flame: { flexDirection: "row", alignItems: "center", gap: 3 },
  prompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.warning, 0.35),
    backgroundColor: withAlpha(colors.warning, 0.06),
  },
  linkTitle: { fontSize: 15, fontWeight: "600" },
});
