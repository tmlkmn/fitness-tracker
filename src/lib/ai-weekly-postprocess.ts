/**
 * Deterministic post-generation cleanup for the weekly plan — runs AFTER the
 * AI + retry loop, so it's the last word.
 *
 * 1. enforceDailyMacroFloors — guarantees each productive day meets its protein
 *    and fat floors. Carb cycling is supposed to move ONLY carbs; protein and
 *    fat must stay high every day (muscle preservation in a cut, hormonal fat
 *    floor). The AI keeps collapsing rest days, so when it falls short we append
 *    one standardized "Macro Top-Up" meal to close the gap.
 * 2. normalizePlanReps — rounds odd AI rep counts (11/14/18) to clean values.
 *
 * Pure (no DB) so it's unit-testable.
 */
import type { AIWeeklyPlan, AIMealItem } from "@/lib/ai-weekly-types";
import type { WeeklyMacroTargets, DayType } from "@/lib/carb-cycling";

// Standard top-up building blocks (per unit).
const WHEY_SCOOP = { protein: 24, carbs: 3, fat: 2, calories: 125 };
const ALMOND_10G = { protein: 2, carbs: 2, fat: 5, calories: 60 };
// Real-food protein source for users who don't use protein powder (or are
// nutrition-only): low-fat strained yogurt per 100g — a natural snack that
// adds protein without disturbing the fat budget.
const LOWFAT_YOGURT_100G = { protein: 10, carbs: 4, fat: 0.2, calories: 59 };

const PROTEIN_FLOOR_RATIO = 0.95; // floor = 95% of the day-type protein target
const FAT_FLOOR_PER_KG = 0.5; // hormonal fat floor, g per kg bodyweight
const MIN_PROTEIN_GAP = 12; // ignore tiny gaps — not worth a top-up
const MIN_FAT_GAP = 8;

/** Per-day context that shapes how a protein/fat top-up is built. */
export interface MealFloorOptions {
  /** workout/swimming day → allows up to 2 whey scoops across 2 meals. */
  isTrainingDay: boolean;
  /**
   * User actually uses protein powder AND is not nutrition-only. When false,
   * the protein top-up uses real food (yogurt) instead of whey — we never
   * suggest a supplement to someone who doesn't take one.
   */
  useProteinPowder: boolean;
}

const DEFAULT_FLOOR_OPTIONS: MealFloorOptions = {
  isTrainingDay: false,
  useProteinPowder: false,
};

function num(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

interface DayTotals { calories: number; protein: number; carbs: number; fat: number }
function sumMeals(meals: AIMealItem[]): DayTotals {
  return meals.reduce<DayTotals>(
    (acc, m) => ({
      calories: acc.calories + num(m.calories),
      protein: acc.protein + num(m.proteinG),
      carbs: acc.carbs + num(m.carbsG),
      fat: acc.fat + num(m.fatG),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function parseMin(t: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return -1;
  return Number.parseInt(m[1], 10) * 60 + Number.parseInt(m[2], 10);
}
function fmtTime(min: number): string {
  const total = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function dayTypeKey(planType: string): DayType {
  if (planType === "workout" || planType === "swimming" || planType === "rest" || planType === "nutrition") {
    return planType;
  }
  return "rest";
}

/**
 * Single-day core of the macro-floor net. Mutates `meals` in place — appending
 * one standardized "Macro Top-Up" meal when the day falls short of its protein
 * or fat floor — and returns the same array. Pure (no DB), so it's shared by the
 * weekly net (per-day loop below) and the daily meal regeneration flow
 * (`generateDailyMeals`), guaranteeing a single-day regen never collapses
 * protein/fat the way carb cycling is allowed to move carbs.
 *
 * `target` is a single day-type macro target (`{ protein, fat }`); callers pass
 * the supplement-adjusted target the meals were generated and graded against.
 */
export function enforceMealFloors(
  meals: AIMealItem[],
  target: { protein: number; fat: number } | null | undefined,
  bodyWeightKg: number | null | undefined,
  locale: "tr" | "en" = "tr",
  opts: MealFloorOptions = DEFAULT_FLOOR_OPTIONS,
): AIMealItem[] {
  if (!target || meals.length === 0) return meals;
  const fatFloorBW =
    bodyWeightKg && bodyWeightKg > 0 ? Math.round(FAT_FLOOR_PER_KG * bodyWeightKg) : 0;
  const totals = sumMeals(meals);
  const proteinGap = Math.round(target.protein * PROTEIN_FLOOR_RATIO) - totals.protein;
  const fatGap = Math.max(target.fat, fatFloorBW) - totals.fat;
  if (proteinGap < MIN_PROTEIN_GAP && fatGap < MIN_FAT_GAP) return meals;

  const topUps = buildTopUpMeals(proteinGap, fatGap, meals, locale, opts);
  for (const m of topUps) meals.push(m);
  return meals;
}

export function enforceDailyMacroFloors(
  plan: AIWeeklyPlan,
  perDayTargets: WeeklyMacroTargets | null | undefined,
  bodyWeightKg: number | null | undefined,
  locale: "tr" | "en" = "tr",
  useProteinPowder: boolean = false,
): AIWeeklyPlan {
  if (!perDayTargets) return plan;

  for (const day of plan.days) {
    if (day.meals.length === 0) continue; // rest/empty days handled elsewhere
    const target = perDayTargets.perDayType[dayTypeKey(day.planType)];
    const isTrainingDay = day.planType === "workout" || day.planType === "swimming";
    enforceMealFloors(day.meals, target, bodyWeightKg, locale, {
      isTrainingDay,
      useProteinPowder,
    });
  }
  return plan;
}

interface MacroParcel { protein: number; carbs: number; fat: number; calories: number }
const EMPTY_PARCEL: MacroParcel = { protein: 0, carbs: 0, fat: 0, calories: 0 };

function scaleParcel(unit: MacroParcel, n: number): MacroParcel {
  return {
    protein: unit.protein * n,
    carbs: unit.carbs * n,
    fat: unit.fat * n,
    calories: unit.calories * n,
  };
}
function addParcel(a: MacroParcel, b: MacroParcel): MacroParcel {
  return {
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    calories: a.calories + b.calories,
  };
}

/** Per-unit counts of each top-up building block for a day's gap. */
interface TopUpQuantities { wheyScoops: number; yogurtUnits: number; almondUnits: number }

/**
 * Decides how many of each building block close the gap, applying the
 * health caps. Whey is only used when the user takes protein powder; the cap
 * is 1 scoop on rest/nutrition days and 2 on training days. Protein the capped
 * whey can't cover spills over to real food (yogurt); fat is topped with almonds.
 */
function planTopUpQuantities(
  proteinGap: number,
  fatGap: number,
  opts: MealFloorOptions,
): TopUpQuantities {
  let wheyScoops = 0;
  if (opts.useProteinPowder && proteinGap >= MIN_PROTEIN_GAP) {
    const scoopCap = opts.isTrainingDay ? 2 : 1;
    // ceil so each scoop pulls toward the floor; clamp to the health cap.
    wheyScoops = Math.min(Math.ceil(proteinGap / WHEY_SCOOP.protein), scoopCap);
  }

  const residualProtein = proteinGap - wheyScoops * WHEY_SCOOP.protein;
  const yogurtUnits =
    residualProtein >= MIN_PROTEIN_GAP
      ? Math.ceil(residualProtein / LOWFAT_YOGURT_100G.protein)
      : 0;

  const fatSoFar = wheyScoops * WHEY_SCOOP.fat + yogurtUnits * LOWFAT_YOGURT_100G.fat;
  const remainingFat = fatGap - fatSoFar;
  const almondUnits =
    remainingFat >= MIN_FAT_GAP ? Math.ceil(remainingFat / ALMOND_10G.fat) : 0;

  return { wheyScoops, yogurtUnits, almondUnits };
}

/**
 * Builds 0–2 standardized "Macro Top-Up" meals to close a day's protein/fat
 * floor gap. Protein-powder dosing is health-capped:
 *   - rest/nutrition day → at most 1 whey scoop (single meal)
 *   - training day       → at most 2 whey scoops, split across 2 SEPARATE meals
 * Whey is only used when `opts.useProteinPowder`; otherwise the protein gap is
 * filled with real food (low-fat strained yogurt). Fat is topped up with
 * almonds (real food, same for everyone).
 */
function buildTopUpMeals(
  proteinGap: number,
  fatGap: number,
  meals: AIMealItem[],
  locale: "tr" | "en",
  opts: MealFloorOptions,
): AIMealItem[] {
  const { wheyScoops, yogurtUnits, almondUnits } = planTopUpQuantities(
    proteinGap,
    fatGap,
    opts,
  );
  if (wheyScoops === 0 && yogurtUnits === 0 && almondUnits === 0) return [];

  // ── Component descriptors (label + per-unit macros) ──────────────────────
  const whey = (n: number) => ({
    text: locale === "en" ? `${n} scoop whey protein` : `${n} ölçek whey protein tozu`,
    macros: scaleParcel(WHEY_SCOOP, n),
  });
  const yogurt = (n: number) => ({
    text:
      locale === "en"
        ? `${n * 100}g low-fat strained yogurt`
        : `${n * 100}g yağsız süzme yoğurt`,
    macros: scaleParcel(LOWFAT_YOGURT_100G, n),
  });
  const almonds = (n: number) => ({
    text: locale === "en" ? `${n * 10}g almonds` : `${n * 10}g badem`,
    macros: scaleParcel(ALMOND_10G, n),
  });

  const note =
    locale === "en"
      ? " (to meet the daily protein/fat floor)"
      : " (günlük protein/yağ tabanını tutturmak için)";
  const label = locale === "en" ? "Macro Top-Up" : "Makro Tamamlayıcı";

  // ── Timing: place after the last meal (+30, capped 23:30); a 2nd meal sits
  //    a few hours earlier so the two scoops land in DIFFERENT meals. ────────
  const times = meals.map((m) => parseMin(m.mealTime)).filter((x) => x >= 0);
  const lastMin = times.length > 0 ? Math.max(...times) : 12 * 60;
  const t1 = Math.min(lastMin + 30, 23 * 60 + 30);
  const t2 = Math.max(6 * 60, Math.min(t1 - 240, t1 - 30));

  const buildMeal = (
    components: { text: string; macros: MacroParcel }[],
    time: number,
  ): AIMealItem => {
    const macros = components.reduce((acc, c) => addParcel(acc, c.macros), EMPTY_PARCEL);
    return {
      mealTime: fmtTime(time),
      mealLabel: label,
      content: components.map((c) => c.text).join(" + ") + note,
      calories: Math.round(macros.calories),
      proteinG: String(Math.round(macros.protein)),
      carbsG: String(Math.round(macros.carbs)),
      fatG: String(Math.round(macros.fat)),
    };
  };

  // ── Assemble. Training day with 2 scoops → one scoop per meal in 2 meals. ──
  if (wheyScoops === 2) {
    const mealA = [whey(1), ...(yogurtUnits > 0 ? [yogurt(yogurtUnits)] : [])];
    const mealB = [whey(1), ...(almondUnits > 0 ? [almonds(almondUnits)] : [])];
    return [buildMeal(mealA, t2), buildMeal(mealB, t1)];
  }

  const components: { text: string; macros: MacroParcel }[] = [];
  if (wheyScoops > 0) components.push(whey(wheyScoops));
  if (yogurtUnits > 0) components.push(yogurt(yogurtUnits));
  if (almondUnits > 0) components.push(almonds(almondUnits));
  return [buildMeal(components, t1)];
}

const CLEAN_REPS = [8, 10, 12, 15, 20];

/** Rounds a single-integer rep count to the nearest clean value (ties round up). Ranges / non-numeric strings are left untouched. */
export function normalizeReps(reps: string | null): string | null {
  if (reps == null) return reps;
  const t = reps.trim();
  if (!/^\d+$/.test(t)) return reps; // "8-12", "AMRAP", etc.
  const n = Number.parseInt(t, 10);
  if (CLEAN_REPS.includes(n)) return reps;
  let best = CLEAN_REPS[0];
  let bestDiff = Math.abs(n - best);
  for (const c of CLEAN_REPS) {
    const d = Math.abs(n - c);
    if (d <= bestDiff) {
      best = c;
      bestDiff = d;
    }
  }
  return String(best);
}

/** Applies normalizeReps to every exercise in the plan (mutates + returns). */
export function normalizePlanReps(plan: AIWeeklyPlan): AIWeeklyPlan {
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      ex.reps = normalizeReps(ex.reps);
    }
  }
  return plan;
}
