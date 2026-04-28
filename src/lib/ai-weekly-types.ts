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
}

export interface ExpectedTargets {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
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
}

import {
  sanitizeMealLabel,
  sanitizePlanType,
  sanitizeSection,
  sanitizeCalories,
  sanitizeProteinG,
  passthroughMacro,
  reconcileMacros,
  isStrictMacroValidationEnabled as defaultStrictMacroEnabled,
} from "@/lib/ai-shape-validators";

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
        weekTitle: String(obj.weekTitle ?? "Haftalık Plan"),
        phase: String(obj.phase ?? "custom"),
        notes: obj.notes != null ? String(obj.notes) : null,
        days: filledDays,
      },
      warnings,
      missingDays: [0, 1, 2, 3, 4, 5, 6],
      planTypeMismatches: [],
      emptyMealDays: [0, 1, 2, 3, 4, 5, 6],
    };
  }

  const rawDays: AIWeeklyDay[] = (obj.days as Record<string, unknown>[]).map((day, index) => {
    const dayName = String(day.dayName ?? "");
    const dayCtx = `day[${index}] (${dayName || "?"})`;

    const meals: AIMealItem[] = Array.isArray(day.meals)
      ? (day.meals as Record<string, unknown>[]).map((m, mi) => {
          const mealCtx = `${dayCtx}.meal[${mi}]`;
          const sanitized: AIMealItem = {
            mealTime: String(m.mealTime ?? "08:00"),
            mealLabel: sanitizeMealLabel(m.mealLabel, mealCtx, warnings),
            content: String(m.content ?? ""),
            calories: sanitizeCalories(m.calories, mealCtx, warnings),
            proteinG: sanitizeProteinG(m.proteinG, mealCtx, warnings),
            carbsG: passthroughMacro(m.carbsG),
            fatG: passthroughMacro(m.fatG),
          };
          return reconcileMacros(sanitized, mealCtx, warnings, strict);
        })
      : [];

    const exercises: AIExerciseItem[] = Array.isArray(day.exercises)
      ? (day.exercises as Record<string, unknown>[]).map((ex, ei) => ({
          section: sanitizeSection(ex.section, `${dayCtx}.exercise[${ei}]`, warnings),
          sectionLabel: String(ex.sectionLabel ?? "Ana Antrenman"),
          name: String(ex.name ?? ""),
          englishName:
            ex.englishName != null && String(ex.englishName).trim() !== ""
              ? String(ex.englishName)
              : null,
          sets: ex.sets != null ? Number(ex.sets) : null,
          reps: ex.reps != null ? String(ex.reps) : null,
          restSeconds: ex.restSeconds != null ? Number(ex.restSeconds) : null,
          durationMinutes: ex.durationMinutes != null ? Number(ex.durationMinutes) : null,
          notes: ex.notes != null ? String(ex.notes) : null,
        }))
      : [];

    const resolvedDow = resolveDayOfWeek(dayName, Number(day.dayOfWeek ?? index), index);
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

  // ─── Weekly average vs expected calorie target ────────────────────────
  if (expectedTargets?.calories) {
    const dailyTotals = rawDays
      .map((d) => d.meals.reduce((sum, m) => sum + (m.calories ?? 0), 0))
      .filter((t) => t > 0);
    if (dailyTotals.length > 0) {
      const avg = dailyTotals.reduce((s, t) => s + t, 0) / dailyTotals.length;
      const drift = Math.abs(avg - expectedTargets.calories) / expectedTargets.calories;
      if (drift > TARGET_AVG_TOLERANCE) {
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
  };
}
