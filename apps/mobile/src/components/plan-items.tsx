import Ionicons from "@expo/vector-icons/Ionicons";
import type { ExerciseDto, MacroTargetsDto, MealDto } from "@fitmusc/shared/api/dto";
import { coerceMealLabel, getLocalizedMealLabel } from "@fitmusc/shared/meal-labels";
import { computeMealMacros } from "@fitmusc/shared/meal-macros";
import type { Locale } from "@fitmusc/shared/locale";
import { Pressable, StyleSheet, View } from "react-native";
import { useLocale, useTranslations } from "use-intl";

import { colors, radius, spacing } from "@/lib/theme";

import { AppText, Card, ProgressBar } from "./ui";

const MEAL_EMOJI: Record<string, string> = {
  Kahvaltı: "🍳",
  "Öğle Yemeği": "🥗",
  "Akşam Yemeği": "🍽️",
  "Ara Öğün": "🍎",
  "Erken Protein": "🥚",
  "Pre-Workout": "⚡",
  "Post-Workout": "💪",
  "Akşam Atıştırması": "🌙",
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

export function MealItem({ meal, onToggle }: { meal: MealDto; onToggle?: (isCompleted: boolean) => void }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("meals.macroSummary");
  const done = Boolean(meal.isCompleted);
  const label = getLocalizedMealLabel(coerceMealLabel(meal.mealLabel), locale);
  const macros = [
    meal.calories != null ? `${meal.calories} kcal` : null,
    meal.proteinG ? `${t("protein")} ${Math.round(Number(meal.proteinG))}g` : null,
    meal.carbsG ? `${t("carbs")} ${Math.round(Number(meal.carbsG))}g` : null,
    meal.fatG ? `${t("fat")} ${Math.round(Number(meal.fatG))}g` : null,
  ].filter(Boolean);

  return (
    <Card style={done && styles.done}>
      <View style={styles.row}>
        <AppText style={styles.emoji}>{meal.icon || MEAL_EMOJI[meal.mealLabel] || "🍴"}</AppText>
        <View style={styles.grow}>
          <AppText variant="heading">{label}</AppText>
          <AppText variant="small">{meal.mealTime}</AppText>
        </View>
        {onToggle ? <CheckButton checked={done} label={label} onPress={() => onToggle(!done)} /> : null}
      </View>
      <AppText style={done && styles.struck}>{meal.content}</AppText>
      {macros.length > 0 ? <AppText variant="small">{macros.join(" · ")}</AppText> : null}
    </Card>
  );
}

export function ExerciseItem({ exercise, onToggle }: { exercise: ExerciseDto; onToggle?: (isCompleted: boolean) => void }) {
  const t = useTranslations("mobile.day");
  const done = Boolean(exercise.isCompleted);
  const detail = [
    exercise.sets ? `${t("sets", { sets: exercise.sets })}${exercise.reps ? ` × ${exercise.reps}` : ""}` : exercise.reps,
    exercise.durationMinutes ? t("minutes", { minutes: exercise.durationMinutes }) : null,
    exercise.restSeconds ? t("rest", { seconds: exercise.restSeconds }) : null,
  ].filter(Boolean);

  return (
    <View style={[styles.exercise, done && styles.done]}>
      <View style={styles.grow}>
        <AppText style={[styles.exerciseName, done && styles.struck]}>{exercise.name}</AppText>
        {detail.length > 0 ? <AppText variant="small">{detail.join(" · ")}</AppText> : null}
        {exercise.notes ? <AppText variant="muted">{exercise.notes}</AppText> : null}
      </View>
      {onToggle ? <CheckButton checked={done} label={exercise.name} onPress={() => onToggle(!done)} /> : null}
    </View>
  );
}

/** Groups exercises by section, keeping the server's sortOrder. */
export function ExerciseSections({
  exercises,
  onToggle,
}: {
  exercises: ExerciseDto[];
  onToggle?: (exercise: ExerciseDto, isCompleted: boolean) => void;
}) {
  const sections: { label: string; items: ExerciseDto[] }[] = [];
  for (const exercise of exercises) {
    const last = sections[sections.length - 1];
    if (last && last.label === exercise.sectionLabel) last.items.push(exercise);
    else sections.push({ label: exercise.sectionLabel, items: [exercise] });
  }
  return (
    <>
      {sections.map((section, i) => (
        <Card key={`${section.label}-${i}`}>
          <AppText variant="heading">{section.label}</AppText>
          {section.items.map((exercise) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              onToggle={onToggle ? (done) => onToggle(exercise, done) : undefined}
            />
          ))}
        </Card>
      ))}
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
  emoji: { fontSize: 26 },
  done: { opacity: 0.6 },
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
  exercise: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  exerciseName: { fontSize: 15, fontWeight: "500" },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },
});
