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

const PROTEIN_FLOOR_RATIO = 0.95; // floor = 95% of the day-type protein target
const FAT_FLOOR_PER_KG = 0.5; // hormonal fat floor, g per kg bodyweight
const MIN_PROTEIN_GAP = 12; // ignore tiny gaps — not worth a top-up
const MIN_FAT_GAP = 8;

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

export function enforceDailyMacroFloors(
  plan: AIWeeklyPlan,
  perDayTargets: WeeklyMacroTargets | null | undefined,
  bodyWeightKg: number | null | undefined,
  locale: "tr" | "en" = "tr",
): AIWeeklyPlan {
  if (!perDayTargets) return plan;
  const fatFloorBW =
    bodyWeightKg && bodyWeightKg > 0 ? Math.round(FAT_FLOOR_PER_KG * bodyWeightKg) : 0;

  for (const day of plan.days) {
    if (day.meals.length === 0) continue; // rest/empty days handled elsewhere
    const target = perDayTargets.perDayType[dayTypeKey(day.planType)];
    if (!target) continue;
    const totals = sumMeals(day.meals);
    const proteinGap = Math.round(target.protein * PROTEIN_FLOOR_RATIO) - totals.protein;
    const fatGap = Math.max(target.fat, fatFloorBW) - totals.fat;
    if (proteinGap < MIN_PROTEIN_GAP && fatGap < MIN_FAT_GAP) continue;

    const topUp = buildTopUpMeal(proteinGap, fatGap, day.meals, locale);
    if (topUp) day.meals.push(topUp);
  }
  return plan;
}

function buildTopUpMeal(
  proteinGap: number,
  fatGap: number,
  meals: AIMealItem[],
  locale: "tr" | "en",
): AIMealItem | null {
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let calories = 0;
  const parts: string[] = [];

  if (proteinGap >= MIN_PROTEIN_GAP) {
    // ceil (not round) so the top-up always REACHES the floor, never undershoots.
    const scoops = Math.max(1, Math.ceil(proteinGap / WHEY_SCOOP.protein));
    protein += scoops * WHEY_SCOOP.protein;
    carbs += scoops * WHEY_SCOOP.carbs;
    fat += scoops * WHEY_SCOOP.fat;
    calories += scoops * WHEY_SCOOP.calories;
    parts.push(locale === "en" ? `${scoops} scoop whey protein` : `${scoops} ölçek whey protein tozu`);
  }

  // Whey already added a little fat — only top up the remaining fat gap.
  const remainingFat = fatGap - fat;
  if (remainingFat >= MIN_FAT_GAP) {
    const units = Math.max(1, Math.ceil(remainingFat / ALMOND_10G.fat));
    protein += units * ALMOND_10G.protein;
    carbs += units * ALMOND_10G.carbs;
    fat += units * ALMOND_10G.fat;
    calories += units * ALMOND_10G.calories;
    parts.push(locale === "en" ? `${units * 10}g almonds` : `${units * 10}g badem`);
  }

  if (parts.length === 0) return null;

  // Place after the last meal (+30 min), capped at 23:30.
  const times = meals.map((m) => parseMin(m.mealTime)).filter((x) => x >= 0);
  const lastMin = times.length > 0 ? Math.max(...times) : 12 * 60;
  const time = fmtTime(Math.min(lastMin + 30, 23 * 60 + 30));

  const note =
    locale === "en"
      ? " (to meet the daily protein/fat floor)"
      : " (günlük protein/yağ tabanını tutturmak için)";

  return {
    mealTime: time,
    mealLabel: locale === "en" ? "Macro Top-Up" : "Makro Tamamlayıcı",
    content: parts.join(" + ") + note,
    calories: Math.round(calories),
    proteinG: String(protein),
    carbsG: String(carbs),
    fatG: String(fat),
  };
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
