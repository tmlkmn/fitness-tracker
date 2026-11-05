/**
 * JSON schemas for the plan flows' structured outputs (`output_config.format`).
 * With a schema the API guarantees the reply parses and matches it, so
 * parse-failure retries and shape coercions (invalid label/section, string
 * macros) mostly disappear. The validators still run as a second line.
 *
 * The API accepts a JSON Schema subset: no numeric / length / array-size
 * constraints, `additionalProperties: false` on every object, and nullable
 * fields written as `anyOf`. `toStructuredOutputSchema` converts a plain
 * JSON schema into that subset; the constraints it drops (day ranges, item
 * counts, …) stay enforced by the validators.
 */

import { AI_MEAL_LABEL_VALUES } from "@/lib/meal-labels";
import { ALLOWED_SECTIONS } from "@/lib/ai-shape-validators";

export type JsonSchema = Record<string, unknown>;

const UNSUPPORTED_KEYWORDS = new Set([
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "uniqueItems",
]);

export function toStructuredOutputSchema(schema: JsonSchema): JsonSchema {
  const out: JsonSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;
    if (key === "properties" && value && typeof value === "object") {
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, JsonSchema>).map(([name, sub]) => [
          name,
          toStructuredOutputSchema(sub),
        ]),
      );
    } else if (key === "items" && value && typeof value === "object") {
      out.items = toStructuredOutputSchema(value as JsonSchema);
    } else {
      out[key] = value;
    }
  }

  // Nullable shorthand `type: ["string", "null"]` → `anyOf` branches.
  if (Array.isArray(out.type)) {
    const { type, enum: enumValues, description, ...rest } = out;
    const types = type as string[];
    const branches: JsonSchema[] = types
      .filter((t) => t !== "null")
      .map((t) => ({
        type: t,
        ...rest,
        ...(Array.isArray(enumValues) ? { enum: enumValues.filter((v) => v !== null) } : {}),
      }));
    if (types.includes("null")) branches.push({ type: "null" });
    return { ...(description ? { description } : {}), anyOf: branches };
  }

  if (out.type === "object") out.additionalProperties = false;
  return out;
}

// ─── Shared item shapes ─────────────────────────────────────────────────────

const MEAL_ITEM: JsonSchema = {
  type: "object",
  properties: {
    mealTime: { type: "string" },
    mealLabel: { type: "string", enum: [...AI_MEAL_LABEL_VALUES] },
    content: { type: "string" },
    calories: { type: "number" },
    proteinG: { type: "number" },
    carbsG: { type: "number" },
    fatG: { type: "number" },
  },
  required: ["mealTime", "mealLabel", "content", "calories", "proteinG", "carbsG", "fatG"],
};

const EXERCISE_ITEM: JsonSchema = {
  type: "object",
  properties: {
    section: { type: "string", enum: [...ALLOWED_SECTIONS] },
    sectionLabel: { type: "string" },
    name: { type: "string" },
    // Non-null on purpose: volume/overload checks look exercises up by their
    // English name, and ~23% of stored working sets had none (uncounted).
    englishName: { type: "string" },
    sets: { type: ["integer", "null"] },
    reps: { type: ["string", "null"] },
    restSeconds: { type: ["integer", "null"] },
    durationMinutes: { type: ["number", "null"] },
    notes: { type: ["string", "null"] },
    intensity: { type: ["string", "null"], enum: ["low", "moderate", "high", null] },
  },
  required: [
    "section",
    "sectionLabel",
    "name",
    "englishName",
    "sets",
    "reps",
    "restSeconds",
    "durationMinutes",
    "notes",
  ],
};

// ─── Flow schemas ────────────────────────────────────────────────────────────

const INGREDIENT_ITEM: JsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    grams: { type: "number" },
    pieceGrams: { type: ["number", "null"] },
    kcalPer100g: { type: "number" },
    proteinPer100g: { type: "number" },
    carbsPer100g: { type: "number" },
    fatPer100g: { type: "number" },
    role: { type: "string", enum: ["protein", "carb", "fat", "veg", "other"] },
  },
  required: ["name", "grams", "pieceGrams", "kcalPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g", "role"],
};

const ENGINE_MEAL_ITEM: JsonSchema = {
  type: "object",
  properties: {
    mealTime: { type: "string" },
    mealLabel: { type: "string", enum: [...AI_MEAL_LABEL_VALUES] },
    recipe: { type: "string" },
    ingredients: { type: "array", items: INGREDIENT_ITEM },
  },
  required: ["mealTime", "mealLabel", "recipe", "ingredients"],
};

/**
 * generateDailyMeals with the macro engine → meals as ingredient lists plus a
 * recipe template; content and macros are computed in macro-engine.
 */
export const DAILY_MEALS_ENGINE_SCHEMA = toStructuredOutputSchema({
  type: "object",
  properties: { meals: { type: "array", items: ENGINE_MEAL_ITEM } },
  required: ["meals"],
});

/** generateDailyMeals without the engine → `{ meals: [...] }`. */
export const DAILY_MEALS_SCHEMA = toStructuredOutputSchema({
  type: "object",
  properties: { meals: { type: "array", items: MEAL_ITEM } },
  required: ["meals"],
});

/** generateWorkoutReplacement → `{ exercises: [...] }`. */
export const DAILY_EXERCISES_SCHEMA = toStructuredOutputSchema({
  type: "object",
  properties: { exercises: { type: "array", items: EXERCISE_ITEM } },
  required: ["exercises"],
});

/** Weekly plan legs (nutrition / workout) → the shape validateWeeklyPlan reads. */
export const WEEKLY_PLAN_SCHEMA = toStructuredOutputSchema({
  type: "object",
  properties: {
    weekTitle: { type: "string" },
    phase: { type: "string" },
    notes: { type: ["string", "null"] },
    strategyNote: {
      type: ["string", "null"],
      description:
        "1-2 cümle (maks 250 char) strateji açıklaması — kullanıcının fitness seviyesi, hedefi, deload/carb-cycling durumu nasıl bu plana dönüştü? 2. tekil şahıs, somut ('Seni hipertrofiye taşımak için 4 antrenman günü, push/pull/lower split kuruldu.'). Generic AI-speak kullanma. Locale: kullanıcının dilinde yaz.",
    },
    days: {
      type: "array",
      minItems: 1,
      maxItems: 7,
      items: {
        type: "object",
        properties: {
          dayOfWeek: { type: "integer", minimum: 0, maximum: 6, description: "0=Pazartesi … 6=Pazar" },
          dayName: { type: "string" },
          planType: { type: "string", enum: ["workout", "swimming", "rest", "nutrition"] },
          workoutTitle: { type: ["string", "null"] },
          meals: { type: "array", items: MEAL_ITEM },
          exercises: { type: "array", items: EXERCISE_ITEM },
        },
        required: ["dayOfWeek", "dayName", "planType", "meals", "exercises"],
      },
    },
  },
  required: ["weekTitle", "days"],
});
