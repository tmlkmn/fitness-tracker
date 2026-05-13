export interface AIMealItem {
  mealTime: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

export interface AIExerciseItem {
  section: string;
  sectionLabel: string;
  name: string;
  englishName: string | null;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

export interface AIWeeklyDay {
  dayOfWeek: number;
  dayName: string;
  planType: string;
  workoutTitle: string | null;
  meals: AIMealItem[];
  exercises: AIExerciseItem[];
}

export interface AIWeeklyPlan {
  weekTitle: string;
  phase: string;
  notes: string | null;
  days: AIWeeklyDay[];
}

export type DayModeChoice = "workout" | "swimming" | "rest" | "nutrition";

export interface ValidateWeeklyPlanResult {
  plan: AIWeeklyPlan;
  warnings: string[];
  /** Days the AI didn't produce (we filled with rest, but route may retry). */
  missingDays: number[];
  /** Days where response.planType ≠ user's selected dayMode (auto-coerced). */
  planTypeMismatches: number[];
  /** Days where meals.length === 0 — every day MUST have meals per spec. */
  emptyMealDays: number[];
  /** Days where AI returned a rest day with exercises (hard-cleared, reported for telemetry). */
  restDaysWithClearedExercises: number[];
  /** Workout/swimming days that are missing one or more required sections. */
  daysWithMissingSections: { dow: number; missing: string[] }[];
  /** Days where weekly-average kcal drift exceeds tolerance (single flag, kept for D's quality retry). */
  weeklyKcalDrift: boolean;
  /** Per-day allergen substring hits across the week. */
  allergenHits: { dow: number; mealIndex: number; allergens: string[] }[];
}

export interface ExpectedTargets {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  /**
   * Optional per-day-type breakdown. When present, the weekly validator
   * checks each day against its own planType's target instead of comparing
   * the weekly average to a single value.
   */
  perDayType?: Partial<Record<"workout" | "swimming" | "rest" | "nutrition", {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>>;
}

export interface ValidateWeeklyPlanOptions {
  /** Override env-based STRICT_MACRO_VALIDATION flag. */
  strictMacroValidation?: boolean;
  /**
   * User's per-day plan-type selection from the modal. When set, validator
   * coerces response.planType to match (warning emitted) and reports
   * planTypeMismatches so the route can retry with explicit instructions.
   */
  expectedDayModes?: Partial<Record<number, DayModeChoice>>;
  /**
   * User's allergen list. Substring matches in any meal.content emit
   * warnings and surface via `allergenHits` so D's quality retry can nudge.
   */
  userAllergens?: string[];
}

import {
  sanitizeMealLabel,
  sanitizePlanType,
  sanitizeSection,
  sanitizeCalories,
  sanitizeMacroGram,
  reconcileMacros,
  safeInteger,
  safeNullableText,
  safeNumber,
  safeString,
  isStrictMacroValidationEnabled as defaultStrictMacroEnabled,
} from "@/lib/ai-shape-validators";
import { detectAllergens } from "@/lib/allergen-detect";

// Weekly-average vs expected target tolerance.
const TARGET_AVG_TOLERANCE = 0.15;

const TURKISH_DAY_NAMES_MAP: Record<string, number> = {
  pazartesi: 0,
  salı: 1,
  "salÄ±": 1,
  çarşamba: 2,
  "Ã§arÅŸamba": 2,
  perşembe: 3,
  "perÅŸembe": 3,
  cuma: 4,
  cumartesi: 5,
  pazar: 6,
};

function resolveDayOfWeek(dayName: string, aiDayOfWeek: number, index: number): number {
  const normalized = dayName.toLowerCase().trim();
  if (normalized in TURKISH_DAY_NAMES_MAP) {
    return TURKISH_DAY_NAMES_MAP[normalized];
  }
  if (aiDayOfWeek >= 0 && aiDayOfWeek <= 6) return aiDayOfWeek;
  return index;
}

// ─── Public entry point ────────────────────────────────────────────────────

const TURKISH_DAY_NAMES_ORDERED = [
  "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar",
] as const;

function isStrictMacroValidationEnabled(opts?: ValidateWeeklyPlanOptions): boolean {
  if (opts?.strictMacroValidation != null) return opts.strictMacroValidation;
  return defaultStrictMacroEnabled();
}

const REQUIRED_SECTIONS_BY_TYPE: Record<string, string[]> = {
  workout: ["warmup", "main", "cooldown"],
  swimming: ["warmup", "swimming", "cooldown"],
};

/**
 * Mutates rawDays: clears exercises on rest days. AI sometimes returns
 * "active recovery" exercises that violate the rest-day contract.
 */
function clearRestDayExercises(rawDays: AIWeeklyDay[], warnings: string[]): number[] {
  const cleared: number[] = [];
  for (const d of rawDays) {
    if (d.planType !== "rest" || d.exercises.length === 0) continue;
    const n = d.exercises.length;
    d.exercises = [];
    cleared.push(d.dayOfWeek);
    warnings.push(
      `day ${d.dayOfWeek} (${d.dayName || TURKISH_DAY_NAMES_ORDERED[d.dayOfWeek]}): rest day had ${n} exercise(s) — hard-cleared`,
    );
  }
  return cleared;
}

/**
 * Scans every meal's content across the week for substring matches against
 * the user's allergen list. Warnings only; the meal stays in the plan so
 * the user is not silently dropped to fewer meals — D's quality retry is
 * the layer that asks the AI to swap the ingredient.
 */
function detectWeeklyAllergenHits(
  rawDays: AIWeeklyDay[],
  userAllergens: string[] | undefined,
  warnings: string[],
): { dow: number; mealIndex: number; allergens: string[] }[] {
  if (!userAllergens || userAllergens.length === 0) return [];
  const hits: { dow: number; mealIndex: number; allergens: string[] }[] = [];
  for (const d of rawDays) {
    d.meals.forEach((m, i) => {
      const found = detectAllergens(m.content, userAllergens);
      if (found.length === 0) return;
      hits.push({ dow: d.dayOfWeek, mealIndex: i, allergens: found });
      warnings.push(
        `day ${d.dayOfWeek} meal[${i}]: allergen match — ${found.join(", ")}`,
      );
    });
  }
  return hits;
}

/**
 * Reports workout/swimming days that are missing required sections. Daily
 * flow requires warmup/main/cooldown (or swimming) on every training day.
 * Weekly used to accept whatever the AI returned; we now report so D's
 * quality retry can nudge the model.
 */
function detectMissingSections(
  rawDays: AIWeeklyDay[],
  warnings: string[],
): { dow: number; missing: string[] }[] {
  const result: { dow: number; missing: string[] }[] = [];
  for (const d of rawDays) {
    const required = REQUIRED_SECTIONS_BY_TYPE[d.planType];
    if (!required) continue;
    const present = new Set(d.exercises.map((ex) => ex.section));
    const missing = required.filter((sec) => !present.has(sec));
    if (missing.length === 0) continue;
    result.push({ dow: d.dayOfWeek, missing });
    warnings.push(
      `day ${d.dayOfWeek} (${d.dayName || TURKISH_DAY_NAMES_ORDERED[d.dayOfWeek]}): ${d.planType} day missing section(s) — ${missing.join(", ")}`,
    );
  }
  return result;
}

export function validateWeeklyPlan(
  data: unknown,
  expectedTargets?: ExpectedTargets,
  options?: ValidateWeeklyPlanOptions,
): ValidateWeeklyPlanResult {
  const obj = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;

  const warnings: string[] = [];
  const planTypeMismatches: number[] = [];
  const emptyMealDays: number[] = [];
  const strict = isStrictMacroValidationEnabled(options);
  const expectedDayModes = options?.expectedDayModes;

  // If the AI omitted `days` entirely (or returned non-array), don't throw —
  // produce a result with missingDays=[0..6] so the route's content-quality
  // retry path is triggered instead of a hard 500.
  if (!Array.isArray(obj.days)) {
    warnings.push(
      `response missing "days" array (got ${typeof obj.days}) — treating all 7 days as missing for retry`,
    );
    const filledDays: AIWeeklyDay[] = [];
    for (let i = 0; i < 7; i++) {
      filledDays.push({
        dayOfWeek: i,
        dayName: TURKISH_DAY_NAMES_ORDERED[i],
        planType: expectedDayModes?.[i] ?? "rest",
        workoutTitle: null,
        meals: [],
        exercises: [],
      });
    }
    return {
      plan: {
        weekTitle: safeString(obj.weekTitle, "Haftalık Plan"),
        phase: safeString(obj.phase, "custom"),
        notes: safeNullableText(obj.notes),
        days: filledDays,
      },
      warnings,
      missingDays: [0, 1, 2, 3, 4, 5, 6],
      planTypeMismatches: [],
      emptyMealDays: [0, 1, 2, 3, 4, 5, 6],
      restDaysWithClearedExercises: [],
      daysWithMissingSections: [],
      weeklyKcalDrift: false,
      allergenHits: [],
    };
  }

  const rawDays: AIWeeklyDay[] = (obj.days as Record<string, unknown>[]).map((day, index) => {
    const dayName = safeString(day.dayName);
    const dayCtx = `day[${index}] (${dayName || "?"})`;

    const meals: AIMealItem[] = Array.isArray(day.meals)
      ? (day.meals as Record<string, unknown>[]).map((m, mi) => {
          const mealCtx = `${dayCtx}.meal[${mi}]`;
          const sanitized: AIMealItem = {
            mealTime: safeString(m.mealTime, "08:00"),
            mealLabel: sanitizeMealLabel(m.mealLabel, mealCtx, warnings),
            content: safeString(m.content),
            calories: sanitizeCalories(m.calories, mealCtx, warnings),
            proteinG: sanitizeMacroGram("protein", m.proteinG, mealCtx, warnings),
            carbsG: sanitizeMacroGram("carbs", m.carbsG, mealCtx, warnings),
            fatG: sanitizeMacroGram("fat", m.fatG, mealCtx, warnings),
          };
          return reconcileMacros(sanitized, mealCtx, warnings, strict);
        })
      : [];

    const exercises: AIExerciseItem[] = Array.isArray(day.exercises)
      ? (day.exercises as Record<string, unknown>[]).map((ex, ei) => ({
          section: sanitizeSection(ex.section, `${dayCtx}.exercise[${ei}]`, warnings),
          sectionLabel: safeString(ex.sectionLabel, "Ana Antrenman"),
          name: safeString(ex.name),
          englishName: safeNullableText(ex.englishName),
          sets: safeInteger(ex.sets),
          reps: safeNullableText(ex.reps),
          restSeconds: safeNumber(ex.restSeconds),
          durationMinutes: safeNumber(ex.durationMinutes),
          notes: safeNullableText(ex.notes),
        }))
      : [];

    const resolvedDow = resolveDayOfWeek(dayName, safeNumber(day.dayOfWeek) ?? index, index);
    let planType = sanitizePlanType(day.planType, dayCtx, warnings);

    // Coerce planType to user's selection if it disagrees. Auto-fix because
    // the route would just retry otherwise; we still report mismatch so the
    // route knows whether to retry for a content-quality reason (workout
    // exercises showing up on a "rest" day, etc.)
    if (expectedDayModes && expectedDayModes[resolvedDow] != null) {
      const expected = expectedDayModes[resolvedDow]!;
      if (planType !== expected) {
        warnings.push(
          `${dayCtx}: planType "${planType}" mismatches user-selected "${expected}" → coerced`,
        );
        planTypeMismatches.push(resolvedDow);
        planType = expected;
      }
    }

    return {
      dayOfWeek: resolvedDow,
      dayName,
      planType,
      workoutTitle: day.workoutTitle != null ? String(day.workoutTitle) : null,
      meals,
      exercises,
    };
  });

  // ─── Detect missing days (AI returned <7 entries) ────────────────────
  const presentDows = new Set(rawDays.map((d) => d.dayOfWeek));
  const missingDays: number[] = [];
  for (let i = 0; i < 7; i++) {
    if (!presentDows.has(i)) missingDays.push(i);
  }

  // Fill missing days as user's expected mode (or rest as fallback). This
  // keeps the UI from breaking on <7-day plans, but warnings are emitted so
  // the route can retry to get real content for these days.
  for (const dow of missingDays) {
    const expected = expectedDayModes?.[dow] ?? "rest";
    warnings.push(
      `day ${dow} (${TURKISH_DAY_NAMES_ORDERED[dow]}) missing from response → filled as "${expected}" with empty meals/exercises`,
    );
    rawDays.push({
      dayOfWeek: dow,
      dayName: TURKISH_DAY_NAMES_ORDERED[dow],
      planType: expected,
      workoutTitle: null,
      meals: [],
      exercises: [],
    });
  }

  // Sort by dow so output is always Mon→Sun
  rawDays.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const restDaysWithClearedExercises = clearRestDayExercises(rawDays, warnings);
  const daysWithMissingSections = detectMissingSections(rawDays, warnings);
  const allergenHits = detectWeeklyAllergenHits(rawDays, options?.userAllergens, warnings);

  // ─── Detect days with empty meals ────────────────────────────────────
  // Every day must have at least one meal regardless of training status.
  for (const d of rawDays) {
    if (d.meals.length === 0) {
      emptyMealDays.push(d.dayOfWeek);
      warnings.push(
        `day ${d.dayOfWeek} (${d.dayName || TURKISH_DAY_NAMES_ORDERED[d.dayOfWeek]}): no meals — every day must have a meal plan`,
      );
    }
  }

  // ─── Per-day or weekly-average kcal target drift ──────────────────────
  let weeklyKcalDrift = false;
  if (expectedTargets?.perDayType) {
    // Per-day-type check — carb cycling distributes targets across days,
    // so comparing each day to its planType target is the correct shape.
    for (const d of rawDays) {
      const dayTotal = d.meals.reduce((sum, m) => sum + (m.calories ?? 0), 0);
      if (dayTotal === 0) continue;
      const dayTarget = expectedTargets.perDayType[d.planType as "workout" | "swimming" | "rest" | "nutrition"];
      if (!dayTarget) continue;
      const drift = Math.abs(dayTotal - dayTarget.calories) / dayTarget.calories;
      if (drift > TARGET_AVG_TOLERANCE) {
        weeklyKcalDrift = true;
        warnings.push(
          `day ${d.dayOfWeek} (${d.planType}) kcal ${dayTotal} drifts ${(drift * 100).toFixed(0)}% from target ${dayTarget.calories} (tolerance ±${TARGET_AVG_TOLERANCE * 100}%)`,
        );
      }
    }
  } else if (expectedTargets?.calories) {
    const dailyTotals = rawDays
      .map((d) => d.meals.reduce((sum, m) => sum + (m.calories ?? 0), 0))
      .filter((t) => t > 0);
    if (dailyTotals.length > 0) {
      const avg = dailyTotals.reduce((s, t) => s + t, 0) / dailyTotals.length;
      const drift = Math.abs(avg - expectedTargets.calories) / expectedTargets.calories;
      if (drift > TARGET_AVG_TOLERANCE) {
        weeklyKcalDrift = true;
        warnings.push(
          `weekly-average kcal ${Math.round(avg)} drifts ${(drift * 100).toFixed(0)}% from target ${expectedTargets.calories} (tolerance ±${TARGET_AVG_TOLERANCE * 100}%)`,
        );
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(`[validateWeeklyPlan] ${warnings.length} warning(s):`, warnings);
  }

  return {
    plan: {
      weekTitle: String(obj.weekTitle ?? "Haftalık Plan"),
      phase: String(obj.phase ?? "custom"),
      notes: obj.notes != null ? String(obj.notes) : null,
      days: rawDays,
    },
    warnings,
    missingDays,
    planTypeMismatches,
    emptyMealDays,
    restDaysWithClearedExercises,
    daysWithMissingSections,
    weeklyKcalDrift,
    allergenHits,
  };
}
