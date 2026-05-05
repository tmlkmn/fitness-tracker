// Single source of truth for meal label vocabulary. Mirrors the CHECK
// constraint installed on meals.meal_label (migration 0031). Both UI
// dropdowns and server-side mutations import from here so a value can
// never reach the DB that would trigger a 23514 check_violation.
//
// The canonical/storage form is Turkish (kept for backward compatibility
// with existing data and the DB constraint). For display in non-Turkish
// locales, use getLocalizedMealLabel().

import type { Locale } from "./locale";

export const MEAL_LABELS = [
  "Kahvaltı",
  "Öğle Yemeği",
  "Akşam Yemeği",
  "Ara Öğün",
  "Erken Protein",
  "Pre-Workout",
  "Post-Workout",
  "Akşam Atıştırması",
] as const;

export type MealLabel = (typeof MEAL_LABELS)[number];

const MEAL_LABEL_SET = new Set<string>(MEAL_LABELS);

export function isMealLabel(value: unknown): value is MealLabel {
  return typeof value === "string" && MEAL_LABEL_SET.has(value);
}

/**
 * Coerce arbitrary input to a valid MealLabel. Used by server actions to
 * defend against UI bypass (direct API calls). Returns the value if valid,
 * else "Ara Öğün" as the safe default.
 */
export function coerceMealLabel(value: unknown): MealLabel {
  return isMealLabel(value) ? value : "Ara Öğün";
}

const MEAL_LABEL_DISPLAY: Record<MealLabel, Record<Locale, string>> = {
  "Kahvaltı": { tr: "Kahvaltı", en: "Breakfast" },
  "Öğle Yemeği": { tr: "Öğle Yemeği", en: "Lunch" },
  "Akşam Yemeği": { tr: "Akşam Yemeği", en: "Dinner" },
  "Ara Öğün": { tr: "Ara Öğün", en: "Snack" },
  "Erken Protein": { tr: "Erken Protein", en: "Early Protein" },
  "Pre-Workout": { tr: "Pre-Workout", en: "Pre-Workout" },
  "Post-Workout": { tr: "Post-Workout", en: "Post-Workout" },
  "Akşam Atıştırması": { tr: "Akşam Atıştırması", en: "Evening Snack" },
};

export function getLocalizedMealLabel(label: MealLabel, locale: Locale): string {
  return MEAL_LABEL_DISPLAY[label]?.[locale] ?? label;
}

/**
 * Maps a (possibly localized) input string back to the canonical MealLabel.
 * Useful when AI returns a localized label that needs to be persisted.
 */
export function normalizeMealLabel(value: string): MealLabel | null {
  if (isMealLabel(value)) return value;
  for (const [canonical, locales] of Object.entries(MEAL_LABEL_DISPLAY) as Array<
    [MealLabel, Record<Locale, string>]
  >) {
    if (Object.values(locales).some((display) => display.toLowerCase() === value.toLowerCase())) {
      return canonical;
    }
  }
  return null;
}

export const MEAL_LABEL_COLORS: Record<MealLabel, string> = {
  "Kahvaltı":          "text-amber-400  border-amber-400/40  bg-amber-400/10",
  "Öğle Yemeği":       "text-green-400  border-green-400/40  bg-green-400/10",
  "Akşam Yemeği":      "text-blue-400   border-blue-400/40   bg-blue-400/10",
  "Ara Öğün":          "text-purple-400 border-purple-400/40 bg-purple-400/10",
  "Erken Protein":     "text-teal-400   border-teal-400/40   bg-teal-400/10",
  "Pre-Workout":       "text-orange-400 border-orange-400/40 bg-orange-400/10",
  "Post-Workout":      "text-cyan-400   border-cyan-400/40   bg-cyan-400/10",
  "Akşam Atıştırması": "text-indigo-400 border-indigo-400/40 bg-indigo-400/10",
};
