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
  /** Optional intensity tag — currently emitted by swimming sections only. */
  intensity: "low" | "moderate" | "high" | null;
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
  /**
   * Brief AI-generated rationale (max 250 chars) explaining how the user's
   * fitness level / goal / deload state / cycling profile shaped THIS plan.
   * Shown directly under `weekTitle` in the preview so users see the "why".
   * Nullable: legacy plans and quick fallbacks may omit it.
   */
  strategyNote: string | null;
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
  /** Days where weekly protein drift exceeds tolerance (per-day-type or weekly-average). */
  weeklyProteinDrift: boolean;
  /** Days where weekly carbs drift exceeds tolerance. */
  weeklyCarbsDrift: boolean;
  /** Days where weekly fat drift exceeds tolerance. */
  weeklyFatDrift: boolean;
  /** Per-day allergen substring hits across the week. */
  allergenHits: { dow: number; mealIndex: number; allergens: string[] }[];
  /** Progressive overload assessment outcome (null when no comparison available). */
  progressiveOverloadIssue: null | {
    kind: "no-progression" | "aggressive-progression" | "deload-violation";
    deltaRatio: number;
    warning: string;
  };
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
  /**
   * Sum of working sets (main/swimming sections) from the *previous* week's
   * generated workout, used by the progressive-overload assessment. Pass 0
   * (or omit) when no prior week exists.
   */
  previousWorkingSets?: number;
  /** True when the AI was asked to produce a deload week. */
  isDeloadWeek?: boolean;
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
import { computeMacroDrift, type MacroTotals } from "@/lib/macro-drift";
import {
  computeWorkingSets,
  assessProgressiveOverload,
} from "@/lib/progressive-overload-validator";

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

/** Coerce raw AI `intensity` into the typed enum or null. */
const MAX_STRATEGY_NOTE_CHARS = 250;

/**
 * Coerce + cap the optional strategyNote field. AI is instructed to keep it
 * under 250 chars; if it overshoots we truncate to keep the UI tidy and emit
 * `[weekly-strategy-too-long]` so admin dashboard sees prompt-discipline drift.
 */
function sanitizeStrategyNote(value: unknown, warnings: string[]): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw === "") return null;
  if (raw.length > MAX_STRATEGY_NOTE_CHARS) {
    warnings.push(
      `[weekly-strategy-too-long] strategyNote ${raw.length} chars > ${MAX_STRATEGY_NOTE_CHARS} — truncated`,
    );
    return raw.slice(0, MAX_STRATEGY_NOTE_CHARS).trimEnd() + "…";
  }
  return raw;
}

function sanitizeIntensity(value: unknown): "low" | "moderate" | "high" | null {
  if (value === "low" || value === "moderate" || value === "high") return value;
  return null;
}

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

/**
 * Run the progressive-overload assessment when the caller supplied a
 * previous-week working-set baseline. Returns null when no comparison is
 * possible (beginners / first-week users) or when no issue was found.
 */
function assessOverloadAgainstPrevious(
  rawDays: AIWeeklyDay[],
  options: ValidateWeeklyPlanOptions | undefined,
  warnings: string[],
): ValidateWeeklyPlanResult["progressiveOverloadIssue"] {
  const prevSets = options?.previousWorkingSets ?? 0;
  if (prevSets <= 0) return null;
  const currentSets = computeWorkingSets({
    weekTitle: "",
    phase: "",
    notes: null,
    strategyNote: null,
    days: rawDays,
  });
  const assessment = assessProgressiveOverload({
    currentSets,
    previousSets: prevSets,
    isDeloadWeek: Boolean(options?.isDeloadWeek),
  });
  if (assessment.ok || !assessment.warning || !assessment.kind) return null;
  warnings.push(assessment.warning);
  return {
    kind: assessment.kind,
    deltaRatio: assessment.deltaRatio,
    warning: assessment.warning,
  };
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
        strategyNote: sanitizeStrategyNote(obj.strategyNote, warnings),
        days: filledDays,
      },
      warnings,
      missingDays: [0, 1, 2, 3, 4, 5, 6],
      planTypeMismatches: [],
      emptyMealDays: [0, 1, 2, 3, 4, 5, 6],
      restDaysWithClearedExercises: [],
      daysWithMissingSections: [],
      weeklyKcalDrift: false,
      weeklyProteinDrift: false,
      weeklyCarbsDrift: false,
      weeklyFatDrift: false,
      allergenHits: [],
      progressiveOverloadIssue: null,
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
          intensity: sanitizeIntensity(ex.intensity),
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

  // ─── Per-day or weekly-average macro target drift ─────────────────────
  // Daily and weekly validators share the same tolerances (kcal ±10%, macros
  // ±15%) via macro-drift.ts. Per-day-type path checks each day against its
  // own planType target (carb cycling); otherwise we compare the weekly
  // average against a single target. Any drift flag flips its `weeklyXDrift`
  // boolean so the quality retry path can pick it up.
  let weeklyKcalDrift = false;
  let weeklyProteinDrift = false;
  let weeklyCarbsDrift = false;
  let weeklyFatDrift = false;

  const dayTotals = (d: AIWeeklyDay): MacroTotals => ({
    calories: d.meals.reduce((s, m) => s + (m.calories ?? 0), 0),
    protein: d.meals.reduce((s, m) => s + Number.parseFloat(m.proteinG ?? "0"), 0),
    carbs: d.meals.reduce((s, m) => s + Number.parseFloat(m.carbsG ?? "0"), 0),
    fat: d.meals.reduce((s, m) => s + Number.parseFloat(m.fatG ?? "0"), 0),
  });

  const flagDrift = (d: ReturnType<typeof computeMacroDrift>) => {
    if (d.calories != null) weeklyKcalDrift = true;
    if (d.protein != null) weeklyProteinDrift = true;
    if (d.carbs != null) weeklyCarbsDrift = true;
    if (d.fat != null) weeklyFatDrift = true;
  };

  if (expectedTargets?.perDayType) {
    for (const d of rawDays) {
      const totals = dayTotals(d);
      if (totals.calories === 0) continue;
      const dayTarget = expectedTargets.perDayType[d.planType as "workout" | "swimming" | "rest" | "nutrition"];
      if (!dayTarget) continue;
      const drift = computeMacroDrift(
        totals,
        dayTarget,
        `day ${d.dayOfWeek} (${d.planType})`,
        warnings,
      );
      flagDrift(drift);
    }
  } else if (expectedTargets) {
    const productiveDays = rawDays
      .map(dayTotals)
      .filter((t) => t.calories > 0);
    if (productiveDays.length > 0) {
      const avg: MacroTotals = {
        calories: productiveDays.reduce((s, t) => s + t.calories, 0) / productiveDays.length,
        protein: productiveDays.reduce((s, t) => s + t.protein, 0) / productiveDays.length,
        carbs: productiveDays.reduce((s, t) => s + t.carbs, 0) / productiveDays.length,
        fat: productiveDays.reduce((s, t) => s + t.fat, 0) / productiveDays.length,
      };
      const drift = computeMacroDrift(
        avg,
        {
          calories: expectedTargets.calories,
          protein: expectedTargets.protein,
          carbs: expectedTargets.carbs,
          fat: expectedTargets.fat,
        },
        "weekly-average",
        warnings,
      );
      flagDrift(drift);
    }
  }

  // ─── Progressive overload (current week vs previous) ──────────────────
  // Only assess when caller supplied previousWorkingSets > 0 — beginners
  // and first-week users skip this check by design.
  const progressiveOverloadIssue = assessOverloadAgainstPrevious(rawDays, options, warnings);

  if (warnings.length > 0) {
    console.warn(`[validateWeeklyPlan] ${warnings.length} warning(s):`, warnings);
  }

  return {
    plan: {
      weekTitle: String(obj.weekTitle ?? "Haftalık Plan"),
      phase: String(obj.phase ?? "custom"),
      notes: obj.notes != null ? String(obj.notes) : null,
      strategyNote: sanitizeStrategyNote(obj.strategyNote, warnings),
      days: rawDays,
    },
    warnings,
    missingDays,
    planTypeMismatches,
    emptyMealDays,
    restDaysWithClearedExercises,
    daysWithMissingSections,
    weeklyKcalDrift,
    weeklyProteinDrift,
    weeklyCarbsDrift,
    weeklyFatDrift,
    allergenHits,
    progressiveOverloadIssue,
  };
}
