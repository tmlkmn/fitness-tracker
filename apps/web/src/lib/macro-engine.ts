/**
 * Deterministic macro engine for AI meal plans.
 *
 * Asking the model to *sum* a day of meals — and to hit its targets by
 * adjusting portions in its head — is where macro drift comes from. Instead
 * the model lists each meal's ingredients with grams and per-100g values (a
 * lookup it is good at), and this module does the arithmetic:
 *
 *   computeMealMacros  — Σ grams/100 × per-100g, per meal.
 *   scaleDayToTargets  — rescale protein / carb / fat portions so the day
 *                        lands on its targets (clamped, rounded to kitchen
 *                        amounts), protein-first like the prompts demand.
 *   renderMealContent  — fills the scaled amounts into the model's recipe
 *                        template ("{0} tavuk göğsünü ızgarada pişir…").
 *
 * Pure functions, no I/O; see scripts/check-macro-engine.ts.
 */

import { ENGLISH_FOODS } from "@/data/foods/english-foods";
import { TURKISH_FOODS } from "@/data/turkish-foods";
import type { Locale } from "@/lib/locale";

export type IngredientRole = "protein" | "carb" | "fat" | "veg" | "other";

export interface MealIngredient {
  name: string;
  grams: number;
  /** Grams per natural piece (egg ≈ 50, bread slice ≈ 30) — null for loose foods. */
  pieceGrams: number | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  role: IngredientRole;
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroTargets {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export const ZERO_MACROS: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

// ─── Reference values ────────────────────────────────────────────────────────

/**
 * Model per-100g kcal further than this from the food DB → use the DB row.
 * Loose on purpose: DB rows are generic (e.g. "Dana bonfile (ızgara)" is a
 * fatty-steak 271 kcal) and the model's value for the specific cut is often
 * closer — a 25% bound replaced a correct 190 kcal and broke the fat target.
 */
const REFERENCE_OVERRIDE_TOLERANCE = 0.4;
/** Stated kcal further than this from 4P+4C+9F → recompute kcal (Atwater). */
const ATWATER_TOLERANCE = 0.2;

type Per100g = Pick<MealIngredient, "kcalPer100g" | "proteinPer100g" | "carbsPer100g" | "fatPer100g">;

/** Lowercase, fold Turkish letters, drop "(cooked)"-style qualifiers and punctuation. */
export function normalizeFoodName(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c] ?? c)
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let referenceTable: Map<string, Per100g> | null = null;

/** Per-100g rows from the static food DBs whose portion is a plain gram amount. */
function getReferenceTable(): Map<string, Per100g> {
  if (referenceTable) return referenceTable;
  const table = new Map<string, Per100g>();
  for (const food of [...TURKISH_FOODS, ...ENGLISH_FOODS]) {
    const m = /^(\d+(?:\.\d+)?)\s*g\b/i.exec(food.portion.trim());
    if (!m) continue;
    const factor = 100 / Number.parseFloat(m[1]);
    table.set(normalizeFoodName(food.name), {
      kcalPer100g: food.calories * factor,
      proteinPer100g: food.protein * factor,
      carbsPer100g: food.carbs * factor,
      fatPer100g: food.fat * factor,
    });
  }
  referenceTable = table;
  return table;
}

/**
 * Returns the ingredient with trustworthy per-100g values: the food DB row
 * when the model's kcal is far off it, and Atwater-consistent kcal otherwise.
 * Pushes a `[ingredient-ref-override]` warning when the DB row is used.
 */
export function resolveIngredientReference(
  ing: MealIngredient,
  ctx: string,
  warnings: string[],
): MealIngredient {
  const ref = getReferenceTable().get(normalizeFoodName(ing.name));
  if (ref && ref.kcalPer100g > 0) {
    const drift = Math.abs(ing.kcalPer100g - ref.kcalPer100g) / ref.kcalPer100g;
    if (drift > REFERENCE_OVERRIDE_TOLERANCE) {
      warnings.push(
        `[ingredient-ref-override] ${ctx} "${ing.name}": ${Math.round(ing.kcalPer100g)} kcal/100g → DB ${Math.round(ref.kcalPer100g)}`,
      );
      return { ...ing, ...ref };
    }
  }
  const atwater = ing.proteinPer100g * 4 + ing.carbsPer100g * 4 + ing.fatPer100g * 9;
  if (atwater > 0 && Math.abs(ing.kcalPer100g - atwater) / atwater > ATWATER_TOLERANCE) {
    return { ...ing, kcalPer100g: atwater };
  }
  return ing;
}

// ─── Arithmetic ──────────────────────────────────────────────────────────────

export function ingredientMacros(ing: MealIngredient): MacroTotals {
  const f = ing.grams / 100;
  return {
    calories: ing.kcalPer100g * f,
    protein: ing.proteinPer100g * f,
    carbs: ing.carbsPer100g * f,
    fat: ing.fatPer100g * f,
  };
}

export function addMacros(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function computeMealMacros(ingredients: readonly MealIngredient[]): MacroTotals {
  return ingredients.reduce((acc, ing) => addMacros(acc, ingredientMacros(ing)), ZERO_MACROS);
}

// ─── Day scaling ─────────────────────────────────────────────────────────────

/** Portion multipliers stay in this band so meals remain recognisable. */
const SCALE_LIMITS: Record<"protein" | "carb" | "fat", [number, number]> = {
  protein: [0.8, 1.25],
  carb: [0.6, 1.6],
  fat: [0.5, 1.8],
};
const SCALE_ITERATIONS = 4;

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

/** Kitchen-friendly amounts: whole pieces, 5g steps, 1g steps under 20g. */
export function roundGrams(ing: MealIngredient, grams: number): number {
  if (ing.pieceGrams && ing.pieceGrams > 0) {
    return Math.max(1, Math.round(grams / ing.pieceGrams)) * ing.pieceGrams;
  }
  if (grams < 20) return Math.max(1, Math.round(grams));
  return Math.max(5, Math.round(grams / 5) * 5);
}

function sumByRole(meals: MealIngredient[][]) {
  const byRole = {
    protein: { ...ZERO_MACROS },
    carb: { ...ZERO_MACROS },
    fat: { ...ZERO_MACROS },
    fixed: { ...ZERO_MACROS },
  };
  for (const ing of meals.flat()) {
    const key = ing.role === "protein" || ing.role === "carb" || ing.role === "fat" ? ing.role : "fixed";
    byRole[key] = addMacros(byRole[key], ingredientMacros(ing));
  }
  return byRole;
}

export interface ScaleResult {
  meals: MealIngredient[][];
  multipliers: { protein: number; carb: number; fat: number };
}

/**
 * Rescales the day's protein-, carb- and fat-role ingredients toward the
 * targets. Protein is solved first (the prompts' anchor), then carbs and fat
 * jointly — carb foods carry some fat and vice versa, so the 2×2 system is
 * re-solved a few times. Veg / other ingredients are never scaled. Missing
 * targets leave that role unscaled; a missing carb target is derived from
 * the kcal target when present.
 */
export function scaleDayToTargets(
  meals: readonly (readonly MealIngredient[])[],
  target: MacroTargets,
): ScaleResult {
  const base = meals.map((m) => m.map((ing) => ({ ...ing })));
  const mult = { protein: 1, carb: 1, fat: 1 };

  const apply = () =>
    base.map((m) =>
      m.map((ing) => {
        const k = ing.role === "protein" || ing.role === "carb" || ing.role === "fat" ? ing.role : null;
        return k ? { ...ing, grams: ing.grams * mult[k] } : { ...ing };
      }),
    );

  for (let i = 0; i < SCALE_ITERATIONS; i++) {
    const r = sumByRole(base); // unscaled per-role totals

    // Protein: everything but protein-role items is at its current multiplier.
    if (target.protein && r.protein.protein > 0) {
      const other = r.fixed.protein + r.carb.protein * mult.carb + r.fat.protein * mult.fat;
      mult.protein = clamp((target.protein - other) / r.protein.protein, SCALE_LIMITS.protein);
    }

    let carbTarget = target.carbs;
    if (carbTarget == null && target.calories && target.fat) {
      const pKcal = (r.fixed.protein + r.protein.protein * mult.protein) * 4;
      carbTarget = Math.max(0, (target.calories - pKcal - target.fat * 9) / 4);
    }

    // Carbs & fat: solve  a·c + b·f = C',  d·c + e·f = F'  for (c, f).
    const cRest = r.fixed.carbs + r.protein.carbs * mult.protein;
    const fRest = r.fixed.fat + r.protein.fat * mult.protein;
    const a = r.carb.carbs, b = r.fat.carbs, d = r.carb.fat, e = r.fat.fat;
    const C = carbTarget != null ? carbTarget - cRest : null;
    const F = target.fat != null ? target.fat - fRest : null;
    const det = a * e - b * d;
    if (C != null && F != null && Math.abs(det) > 1e-9) {
      const c0 = (C * e - b * F) / det;
      const f0 = (a * F - C * d) / det;
      mult.carb = clamp(c0, SCALE_LIMITS.carb);
      mult.fat = clamp(f0, SCALE_LIMITS.fat);
      // One side hit its limit → re-solve the other for the clamped value.
      if (mult.carb !== c0 && e > 0) mult.fat = clamp((F - d * mult.carb) / e, SCALE_LIMITS.fat);
      else if (mult.fat !== f0 && a > 0) mult.carb = clamp((C - b * mult.fat) / a, SCALE_LIMITS.carb);
    } else {
      if (C != null && a > 0) mult.carb = clamp((C - b * mult.fat) / a, SCALE_LIMITS.carb);
      if (F != null && e > 0) mult.fat = clamp((F - d * mult.carb) / e, SCALE_LIMITS.fat);
    }
  }

  const scaled = apply().map((m) => m.map((ing) => ({ ...ing, grams: roundGrams(ing, ing.grams) })));
  return { meals: scaled, multipliers: { ...mult } };
}

// ─── Day pipeline ────────────────────────────────────────────────────────────

const ROLES = new Set<IngredientRole>(["protein", "carb", "fat", "veg", "other"]);
/** Multiplier drift from ×1 worth reporting as `[engine-scaled]` telemetry. */
const SCALE_REPORT_THRESHOLD = 0.1;

const finite = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
};

function parseIngredients(raw: unknown, ctx: string, warnings: string[]): MealIngredient[] {
  if (!Array.isArray(raw)) return [];
  const out: MealIngredient[] = [];
  raw.forEach((item, i) => {
    const r = (item ?? {}) as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const grams = finite(r.grams);
    const per = [r.kcalPer100g, r.proteinPer100g, r.carbsPer100g, r.fatPer100g].map(finite);
    if (!name || grams == null || grams <= 0 || per.some((v) => v == null || v < 0)) {
      warnings.push(`[engine-ingredient-dropped] ${ctx}.ingredients[${i}]: unusable values`);
      return;
    }
    const role = ROLES.has(r.role as IngredientRole) ? (r.role as IngredientRole) : "other";
    const piece = finite(r.pieceGrams);
    const ing: MealIngredient = {
      name,
      grams,
      pieceGrams: piece != null && piece > 0 ? piece : null,
      kcalPer100g: per[0]!,
      proteinPer100g: per[1]!,
      carbsPer100g: per[2]!,
      fatPer100g: per[3]!,
      role,
    };
    out.push(resolveIngredientReference(ing, `${ctx}.ingredients[${i}]`, warnings));
  });
  return out;
}

/** The meal's recipe template (`recipe`, or a plain `note` from older replies). */
function recipeOf(m: Record<string, unknown>): string {
  if (typeof m.recipe === "string") return m.recipe;
  return typeof m.note === "string" ? m.note : "";
}

/**
 * Turns a model reply of ingredient-based meals into the `{ mealTime,
 * mealLabel, content, calories, proteinG, carbsG, fatG }` shape the daily
 * validator expects: macros computed from the ingredients, portions scaled
 * so the day lands on `target`, content rendered from the scaled list.
 * Meals without usable ingredients pass through as the model wrote them and
 * count as fixed toward the targets.
 */
export function applyMacroEngine(
  meals: readonly Record<string, unknown>[],
  target: MacroTargets | undefined,
  locale: Locale,
  warnings: string[],
): Record<string, unknown>[] {
  const parsed = meals.map((m, i) => parseIngredients(m.ingredients, `meal[${i}]`, warnings));

  let fixed = { ...ZERO_MACROS };
  meals.forEach((m, i) => {
    if (parsed[i].length > 0) return;
    warnings.push(`[engine-fallback] meal[${i}]: no usable ingredients — kept model macros`);
    fixed = addMacros(fixed, {
      calories: finite(m.calories) ?? 0,
      protein: finite(m.proteinG) ?? 0,
      carbs: finite(m.carbsG) ?? 0,
      fat: finite(m.fatG) ?? 0,
    });
  });

  const engineIdx = parsed.map((ings, i) => (ings.length > 0 ? i : -1)).filter((i) => i >= 0);
  let scaledMeals = engineIdx.map((i) => parsed[i]);
  if (target && engineIdx.length > 0) {
    const remaining: MacroTargets = {
      calories: target.calories != null ? target.calories - fixed.calories : undefined,
      protein: target.protein != null ? target.protein - fixed.protein : undefined,
      carbs: target.carbs != null ? target.carbs - fixed.carbs : undefined,
      fat: target.fat != null ? target.fat - fixed.fat : undefined,
    };
    const result = scaleDayToTargets(scaledMeals, remaining);
    scaledMeals = result.meals;
    const drift = Object.entries(result.multipliers).filter(([, v]) => Math.abs(v - 1) > SCALE_REPORT_THRESHOLD);
    if (drift.length > 0) {
      warnings.push(`[engine-scaled] ${drift.map(([k, v]) => `${k} ×${v.toFixed(2)}`).join(", ")}`);
    }
  }

  return meals.map((m, i) => {
    const pos = engineIdx.indexOf(i);
    if (pos < 0) return { ...m };
    const ings = scaledMeals[pos];
    const totals = computeMealMacros(ings);
    return {
      mealTime: m.mealTime,
      mealLabel: m.mealLabel,
      content: renderMealContent(ings, recipeOf(m), locale),
      calories: Math.round(totals.calories),
      proteinG: Math.round(totals.protein),
      carbsG: Math.round(totals.carbs),
      fatG: Math.round(totals.fat),
    };
  });
}

// ─── Rendering ───────────────────────────────────────────────────────────────

const PLACEHOLDER_RE = /\{(\d+)\}/g;

/** "150g" for loose foods, the piece count ("2") for countable ones. */
function amountText(ing: MealIngredient): string {
  if (ing.pieceGrams && ing.pieceGrams > 0) return String(Math.round(ing.grams / ing.pieceGrams));
  return `${Math.round(ing.grams)}g`;
}

/**
 * Renders a meal's display text. The model writes a chef-style recipe with
 * `{n}` in place of ingredient n's amount ("{0} yumurtayı {1} lor ile…");
 * the scaled amounts are filled in here, so the prose stays natural while the
 * quantities are the engine's. When the placeholders don't cover every
 * ingredient exactly, falls back to "150g tavuk göğsü, 80g bulgur — recipe"
 * with the placeholders stripped.
 */
export function renderMealContent(
  ingredients: readonly MealIngredient[],
  recipe: string,
  locale: Locale,
): string {
  const text = recipe.trim().replace(/\s+/g, " ");
  const indices = [...text.matchAll(PLACEHOLDER_RE)].map((m) => Number(m[1]));
  const covered = new Set(indices);
  const templateOk =
    indices.length > 0 &&
    indices.every((i) => i < ingredients.length) &&
    ingredients.every((_, i) => covered.has(i));
  if (templateOk) {
    return text.replace(PLACEHOLDER_RE, (_, i: string) => amountText(ingredients[Number(i)]));
  }

  const piece = locale === "en" ? "pc" : "adet";
  const list = ingredients
    .map((ing) => {
      const g = `${Math.round(ing.grams)}g ${ing.name}`;
      if (!ing.pieceGrams || ing.pieceGrams <= 0) return g;
      return `${g} (${Math.round(ing.grams / ing.pieceGrams)} ${piece})`;
    })
    .join(", ");
  const note = text.replace(PLACEHOLDER_RE, "").replace(/\s{2,}/g, " ").trim();
  return note ? `${list} — ${note}` : list;
}
