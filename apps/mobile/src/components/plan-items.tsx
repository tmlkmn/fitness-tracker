import Ionicons from "@expo/vector-icons/Ionicons";
import type { ExerciseDto, MacroTargetsDto, MealDto } from "@fitmusc/shared/api/dto";
import { intlLocale } from "@fitmusc/shared/date-format";
import type { Locale } from "@fitmusc/shared/locale";
import { coerceMealLabel, getLocalizedMealLabel } from "@fitmusc/shared/meal-labels";
import { computeMealMacros } from "@fitmusc/shared/meal-macros";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { colors, macroColors, radius, spacing, withAlpha } from "@/lib/theme";

import { AiIconButton } from "./ai";
import { AppText, Card, ProgressBar } from "./ui";
import { Pill, type IconName } from "./visual";

/** A meal's emoji when it has no icon override (`meals.icon`). */
export const MEAL_EMOJI: Record<string, string> = {
  Kahvaltı: "🍳",
  "Öğle Yemeği": "🥗",
  "Akşam Yemeği": "🍽️",
  "Ara Öğün": "🍎",
  "Erken Protein": "🥚",
  "Pre-Workout": "⚡",
  "Post-Workout": "💪",
  "Akşam Atıştırması": "🌙",
};

/** Workout section → icon, like the web's section headers. */
const SECTION_ICONS: Record<string, IconName> = {
  warmup: "flame",
  main: "barbell",
  cooldown: "snow",
  sauna: "thermometer",
  swimming: "water",
};

function CheckButton({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={12}
      onPress={onPress}
      style={[styles.check, checked && styles.checkOn]}
    >
      {checked ? <Ionicons name="checkmark" size={18} color={colors.primaryText} /> : null}
    </Pressable>
  );
}

/** Icon over a small label — the web cards' bottom action bar. */
function CardAction({ icon, label, onPress, color = colors.textMuted }: { icon: IconName; label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.cardPressed }]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <AppText style={[styles.actionLabel, { color }]}>{label}</AppText>
    </Pressable>
  );
}

export function MealItem({
  meal,
  onToggle,
  onPress,
  onAi,
}: {
  meal: MealDto;
  onToggle?: (isCompleted: boolean) => void;
  /** Opens the meal for editing. */
  onPress?: () => void;
  /** Opens the AI alternatives for this meal. */
  onAi?: () => void;
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const done = Boolean(meal.isCompleted);
  const label = getLocalizedMealLabel(coerceMealLabel(meal.mealLabel), locale);
  const grams = (value: string | null) => (value ? Math.round(Number(value)) : 0);
  const macros = [
    { label: t("meals.macroSummary.protein"), value: grams(meal.proteinG), color: macroColors.protein },
    { label: t("meals.macroSummary.carbs"), value: grams(meal.carbsG), color: macroColors.carbs },
    { label: t("meals.macroSummary.fat"), value: grams(meal.fatG), color: macroColors.fat },
  ].filter((m) => m.value > 0);
  const actions = !done && (onPress || onAi);

  const card = (pressed: boolean) => (
    <Card style={[styles.mealCard, done && styles.done, pressed && styles.pressed]}>
      <View style={styles.mealBody}>
        <View style={styles.row}>
          <View style={styles.mealIcon}>
            <AppText style={styles.emoji}>{meal.icon || MEAL_EMOJI[meal.mealLabel] || "🍴"}</AppText>
          </View>
          <View style={styles.grow}>
            <AppText variant="heading" style={done && styles.struck} numberOfLines={1}>
              {label}
            </AppText>
            <View style={styles.meta}>
              {meal.mealTime ? (
                <View style={styles.time}>
                  <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                  <AppText variant="small" style={styles.tabular}>
                    {meal.mealTime}
                  </AppText>
                </View>
              ) : null}
              {meal.calories != null ? <Pill icon="flame" label={`${meal.calories} kcal`} color={macroColors.calories} /> : null}
            </View>
          </View>
          {onToggle ? <CheckButton checked={done} label={label} onPress={() => onToggle(!done)} /> : null}
        </View>
        <AppText variant="muted" style={done && styles.struck}>
          {meal.content}
        </AppText>
        {macros.length > 0 ? (
          <View style={styles.chips}>
            {macros.map((m) => (
              <Pill key={m.label} label={`${m.label} ${m.value} g`} color={m.color} />
            ))}
          </View>
        ) : null}
      </View>
      {actions ? (
        <View style={styles.actions}>
          {onPress ? <CardAction icon="create-outline" label={t("common.edit")} onPress={onPress} /> : null}
          <View style={styles.grow} />
          {onAi ? <CardAction icon="sparkles" label={t("meals.card.ai")} color={colors.primary} onPress={onAi} /> : null}
        </View>
      ) : null}
    </Card>
  );
  if (!onPress) return card(false);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {({ pressed }) => card(pressed)}
    </Pressable>
  );
}

export function ExerciseItem({
  exercise,
  onToggle,
  onPress,
  onAi,
  first = false,
}: {
  exercise: ExerciseDto;
  onToggle?: (isCompleted: boolean) => void;
  onPress?: () => void;
  /** Opens alternatives / form tips for this exercise. */
  onAi?: () => void;
  /** No divider above the first row of a section. */
  first?: boolean;
}) {
  const t = useTranslations("workout.card");
  const ta = useTranslations("mobile.ai");
  const done = Boolean(exercise.isCompleted);
  const volume =
    exercise.sets && exercise.reps ? `${exercise.sets}×${exercise.reps}` : exercise.sets ? `${exercise.sets} set` : exercise.reps;

  return (
    <View style={[styles.exercise, !first && styles.divided, done && styles.done]}>
      <Pressable
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        onPress={onPress}
        style={({ pressed }) => [styles.grow, { gap: spacing.xs }, pressed && styles.pressedText]}
      >
        <AppText style={[styles.exerciseName, done && styles.struck]}>{exercise.name}</AppText>
        {volume || exercise.durationMinutes || exercise.restSeconds ? (
          <View style={styles.chips}>
            {volume ? <Pill icon="repeat" label={volume} color={colors.primary} /> : null}
            {exercise.durationMinutes ? (
              <Pill icon="time-outline" label={`${exercise.durationMinutes} ${t("minutesShort")}`} color={colors.textMuted} />
            ) : null}
            {exercise.restSeconds ? (
              <Pill icon="hourglass-outline" label={`${exercise.restSeconds} ${t("secondsShort")}`} color={colors.textMuted} />
            ) : null}
          </View>
        ) : null}
        {exercise.notes ? <AppText style={[styles.note, done && styles.struck]}>{exercise.notes}</AppText> : null}
      </Pressable>
      {onAi && !done ? <AiIconButton label={ta("exerciseAi", { name: exercise.name })} onPress={onAi} /> : null}
      {onToggle ? <CheckButton checked={done} label={exercise.name} onPress={() => onToggle(!done)} /> : null}
    </View>
  );
}

/** Groups exercises by section, keeping the server's sortOrder. */
export function ExerciseSections({
  exercises,
  onToggle,
  onPress,
  onAi,
  onSectionAi,
}: {
  exercises: ExerciseDto[];
  onToggle?: (exercise: ExerciseDto, isCompleted: boolean) => void;
  onPress?: (exercise: ExerciseDto) => void;
  onAi?: (exercise: ExerciseDto) => void;
  /** Regenerates one section with AI (web: the section header's ✦). */
  onSectionAi?: (section: string, sectionLabel: string) => void;
}) {
  const ts = useTranslations("workout.section");
  const locale = useLocale() as Locale;
  const sections: { label: string; items: ExerciseDto[] }[] = [];
  for (const exercise of exercises) {
    const last = sections[sections.length - 1];
    if (last && last.label === exercise.sectionLabel) last.items.push(exercise);
    else sections.push({ label: exercise.sectionLabel, items: [exercise] });
  }
  return (
    <>
      {sections.map((section, i) => {
        const key = section.items[0].section;
        const doneCount = section.items.filter((e) => e.isCompleted).length;
        return (
          <Card key={`${section.label}-${i}`} style={{ gap: spacing.sm }}>
            <View style={styles.sectionHead}>
              <Ionicons name={SECTION_ICONS[key] ?? "barbell"} size={15} color={colors.primary} />
              <AppText style={styles.sectionLabel} numberOfLines={1}>
                {section.label.toLocaleUpperCase(intlLocale(locale))}
              </AppText>
              <AppText variant="small" style={styles.tabular}>
                {doneCount}/{section.items.length}
              </AppText>
              {onSectionAi ? (
                <AiIconButton label={ts("aiChangeSection", { section: section.label })} onPress={() => onSectionAi(key, section.label)} />
              ) : null}
            </View>
            {section.items.map((exercise, index) => (
              <ExerciseItem
                key={exercise.id}
                exercise={exercise}
                first={index === 0}
                onToggle={onToggle ? (done) => onToggle(exercise, done) : undefined}
                onPress={onPress ? () => onPress(exercise) : undefined}
                onAi={onAi ? () => onAi(exercise) : undefined}
              />
            ))}
          </Card>
        );
      })}
    </>
  );
}

/** Completed meals' macros against the day's targets (same colour bands as the web: <90% amber, ≤110% green, above red). */
export function MacroSummary({ meals, targets }: { meals: MealDto[]; targets: MacroTargetsDto | null | undefined }) {
  const t = useTranslations("mobile.macros");
  const tm = useTranslations("meals.macroSummary");
  const eaten = computeMealMacros(meals.filter((m) => m.isCompleted));
  const rows = [
    { label: t("calories"), value: eaten.calories, target: targets?.calories, unit: "kcal" as const },
    { label: tm("protein"), value: eaten.protein, target: targets?.protein, unit: "g" as const },
    { label: tm("carbs"), value: eaten.carbs, target: targets?.carbs, unit: "g" as const },
    { label: tm("fat"), value: eaten.fat, target: targets?.fat, unit: "g" as const },
  ];
  return (
    <View style={{ gap: spacing.md }}>
      {rows.map((row) => {
        const target = Math.round(row.target ?? 0);
        const ratio = target > 0 ? row.value / target : 0;
        const color = ratio > 1.1 ? colors.danger : ratio >= 0.9 ? colors.primary : colors.warning;
        return (
          <View key={row.label} style={{ gap: spacing.xs }}>
            <View style={styles.macroRow}>
              <AppText variant="muted">{row.label}</AppText>
              <AppText variant="small">
                {target > 0
                  ? t(row.unit === "kcal" ? "kcal" : "grams", { value: row.value, target })
                  : `${row.value} ${row.unit}`}
              </AppText>
            </View>
            <ProgressBar value={row.value} max={target} color={color} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, gap: 2 },
  tabular: { fontVariant: ["tabular-nums"] },
  emoji: { fontSize: 22 },
  done: { opacity: 0.6 },
  pressed: { backgroundColor: colors.cardPressed },
  pressedText: { opacity: 0.6 },
  struck: { textDecorationLine: "line-through" },
  check: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  mealCard: { padding: 0, gap: 0, overflow: "hidden" },
  mealBody: { padding: spacing.lg, gap: spacing.sm },
  mealIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha(colors.primary, 0.12),
  },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  time: { flexDirection: "row", alignItems: "center", gap: 3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  action: { alignItems: "center", justifyContent: "center", gap: 2, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  actionLabel: { fontSize: 11, fontWeight: "500" },
  exercise: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  exerciseName: { fontSize: 15, fontWeight: "600" },
  note: { fontSize: 13, color: colors.warning },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sectionLabel: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.primary, letterSpacing: 0.8 },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },
});
