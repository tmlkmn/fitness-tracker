// Single source of truth for meal label vocabulary. Mirrors the CHECK
// constraint installed on meals.meal_label (migration 0031). Both UI
// dropdowns and server-side mutations import from here so a value can
// never reach the DB that would trigger a 23514 check_violation.

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
