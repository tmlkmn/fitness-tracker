import { View, Text, baseStyles, PALETTE } from "./pdf-base";
import { StyleSheet } from "@react-pdf/renderer";
import type { MealRow, ExerciseRow } from "@/lib/export/collect-weekly-plan";
import { computeMealMacros } from "@/lib/meal-macros";
import {
  getLocalizedMealLabel,
  isMealLabel,
  type MealLabel,
} from "@/lib/meal-labels";
import type { Locale } from "@/lib/locale";

export interface ExportLabels {
  brand: string;
  generatedAt: string;
  footer: string;
  // meals
  meals: string;
  time: string;
  meal: string;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  calories: string;
  proteinFull: string;
  carbsFull: string;
  fatFull: string;
  dayTotal: string;
  noMeals: string;
  // workout
  workout: string;
  sets: string;
  reps: string;
  rest: string;
  duration: string;
  noWorkout: string;
  min: string;
  sec: string;
  // supplements
  supplements: string;
  dosage: string;
  timing: string;
  // targets
  targets: string;
  // plan types
  planType: {
    workout: string;
    swimming: string;
    rest: string;
    nutrition: string;
  };
  // shopping
  shoppingTitle: string;
  itemsProgress: string;
  // progress
  progressTitle: string;
  date: string;
  weight: string;
  measurements: string;
  bodyComposition: string;
  latest: string;
  weightTrend: string;
  notes: string;
  noData: string;
}

const styles = StyleSheet.create({
  mealRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  // Filled rects instead of element borders: a border on a row that lands on a
  // page boundary makes react-pdf's border-clip path produce NaN coords and
  // crash. Background fills paint through a different, safe code path.
  rowDivider: { height: 0.5, backgroundColor: PALETTE.border },
  totalDivider: { height: 1, backgroundColor: PALETTE.rule, marginTop: 3, marginBottom: 5 },
  mealLeft: { width: 64 },
  mealTime: { fontWeight: 700 },
  mealMid: { flex: 1, paddingRight: 8 },
  mealMacro: { width: 132, textAlign: "right" },
  mealKcal: { fontWeight: 700 },
  mealMacroSub: { fontSize: 8, color: PALETTE.faint },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  exGroupTitle: {
    fontSize: 8.5,
    color: PALETTE.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 7,
    marginBottom: 3,
  },
  exRow: { flexDirection: "row", paddingVertical: 2 },
  exName: { flex: 1, paddingRight: 8 },
  exMeta: { width: 150, textAlign: "right", color: PALETTE.muted },
  exNote: { color: PALETTE.faint, fontSize: 8, marginTop: 1, paddingRight: 8 },
});

function macroSummary(m: { protein: number; carbs: number; fat: number }, L: ExportLabels): string {
  return `${L.protein} ${m.protein}g · ${L.carbs} ${m.carbs}g · ${L.fat} ${m.fat}g`;
}

export function planTypeLabel(planType: string, L: ExportLabels): string {
  if (planType === "workout") return L.planType.workout;
  if (planType === "swimming") return L.planType.swimming;
  if (planType === "rest") return L.planType.rest;
  if (planType === "nutrition") return L.planType.nutrition;
  return planType;
}

export function MealsBlock({
  meals,
  locale,
  L,
}: {
  meals: MealRow[];
  locale: Locale;
  L: ExportLabels;
}) {
  if (meals.length === 0) {
    return <Text style={baseStyles.faint}>{L.noMeals}</Text>;
  }
  const totals = computeMealMacros(meals);
  return (
    <View>
      {meals.map((m) => {
        const label = isMealLabel(m.mealLabel)
          ? getLocalizedMealLabel(m.mealLabel as MealLabel, locale)
          : m.mealLabel;
        const macros = computeMealMacros([m]);
        return (
          <View key={m.id} wrap={false}>
            <View style={styles.mealRow}>
              <View style={styles.mealLeft}>
                <Text style={styles.mealTime}>{m.mealTime}</Text>
                <Text style={baseStyles.faint}>{label}</Text>
              </View>
              <View style={styles.mealMid}>
                <Text>{m.content}</Text>
              </View>
              <View style={styles.mealMacro}>
                {m.calories != null ? (
                  <Text style={styles.mealKcal}>
                    {m.calories} {L.kcal}
                  </Text>
                ) : null}
                <Text style={styles.mealMacroSub}>{macroSummary(macros, L)}</Text>
              </View>
            </View>
            <View style={styles.rowDivider} />
          </View>
        );
      })}
      <View wrap={false}>
        <View style={styles.totalDivider} />
        <View style={styles.totalRow}>
          <Text style={baseStyles.bold}>{L.dayTotal}</Text>
          <Text style={baseStyles.bold}>
            {totals.calories} {L.kcal} · {macroSummary(totals, L)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function WorkoutBlock({
  exercises,
  L,
}: {
  exercises: ExerciseRow[];
  L: ExportLabels;
}) {
  if (exercises.length === 0) {
    return <Text style={baseStyles.faint}>{L.noWorkout}</Text>;
  }
  // Preserve insertion order of sections (already sorted by sortOrder).
  const groups: { label: string; items: ExerciseRow[] }[] = [];
  for (const ex of exercises) {
    const key = ex.sectionLabel || ex.section;
    let group = groups.find((g) => g.label === key);
    if (!group) {
      group = { label: key, items: [] };
      groups.push(group);
    }
    group.items.push(ex);
  }

  return (
    <View>
      {groups.map((g, gi) => (
        <View key={gi}>
          <Text style={styles.exGroupTitle}>{g.label}</Text>
          {g.items.map((ex) => {
            const meta: string[] = [];
            if (ex.sets != null && ex.reps) meta.push(`${ex.sets}×${ex.reps}`);
            else if (ex.sets != null) meta.push(`${ex.sets} ${L.sets}`);
            else if (ex.reps) meta.push(ex.reps);
            if (ex.durationMinutes != null)
              meta.push(`${ex.durationMinutes} ${L.min}`);
            if (ex.restSeconds != null)
              meta.push(`${L.rest} ${ex.restSeconds} ${L.sec}`);
            return (
              <View key={ex.id} wrap={false}>
                <View style={styles.exRow}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exMeta}>{meta.join(" · ")}</Text>
                </View>
                {ex.notes ? <Text style={styles.exNote}>{ex.notes}</Text> : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
