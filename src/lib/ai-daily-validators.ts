/**
 * Validators for single-day AI generation flows (daily meals + daily workout).
 * Same warning + retry-trigger pattern as the weekly validator, scoped to one
 * day's worth of content.
 */

import {
  isStrictMacroValidationEnabled as defaultStrictMacroEnabled,
  reconcileMacros,
  safeInteger,
  safeNullableText,
  safeString,
  sanitizeCalories,
  sanitizeDurationMinutes,
  sanitizeMacroGram,
  sanitizeMealLabel,
  sanitizeRestSeconds,
  sanitizeSection,
} from "@/lib/ai-shape-validators";
import { detectAllergens } from "@/lib/allergen-detect";
import { computeMacroDrift } from "@/lib/macro-drift";

// ─── Meal array ────────────────────────────────────────────────────────────

export interface DailyMealItem {
  mealTime: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

export interface DailyExpectedTargets {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface ValidateDailyMealsOptions {
  strictMacroValidation?: boolean;
  /**
   * Minimum number of meals expected for this day. Used to flag thin AI
   * responses that should trigger a retry (e.g., user policy says 5-7 meals
   * but AI only produced 3).
   */
  minMealsExpected?: number;
  /** Per-day macro targets. Triggers daily-total drift check + retry. */
  expectedTargets?: DailyExpectedTargets;
  /** User's allergen list. Substring matches in meal content emit warnings. */
  userAllergens?: string[];
}

export interface ValidateDailyMealsResult {
  meals: DailyMealItem[];
  warnings: string[];
  /** Meals whose `content` is empty/whitespace — useless to user. */
  emptyContentMeals: number[];
  /** True when meals.length < minMealsExpected. */
  belowExpectedCount: boolean;
  /** Per-meal allergen substring matches (Turkish-fold, case-insensitive). */
  allergenHits: { mealIndex: number; allergens: string[] }[];
  /**
   * Per-target drift ratio (|actual − expected| / expected) when above
   * tolerance. Missing keys = within tolerance or target not provided.
   */
  macroDrift: { calories?: number; protein?: number; carbs?: number; fat?: number };
}

interface SanitizedDailyMeals {
  meals: DailyMealItem[];
  warnings: string[];
  emptyContentMeals: number[];
}

/**
 * Pure sanitize pass — coerces shapes, applies macro reconciliation, and
 * records any empty-content meals. Throws on parse-format failure.
 */
export function sanitizeDailyMeals(
  data: unknown,
  options: Pick<ValidateDailyMealsOptions, "strictMacroValidation"> = {},
): SanitizedDailyMeals {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.meals)) {
    throw new Error("Invalid response format: expected { meals: [...] }");
  }

  const warnings: string[] = [];
  const emptyContentMeals: number[] = [];
  const strict = options.strictMacroValidation ?? defaultStrictMacroEnabled();

  const meals: DailyMealItem[] = (obj.meals as Record<string, unknown>[]).map(
    (m, i) => {
      const ctx = `meal[${i}]`;
      const content = safeString(m.content).trim();
      if (content === "") {
        emptyContentMeals.push(i);
        warnings.push(`${ctx}: empty content`);
      }
      const sanitized: DailyMealItem = {
        mealTime: safeString(m.mealTime, "08:00"),
        mealLabel: sanitizeMealLabel(m.mealLabel, ctx, warnings),
        content,
        calories: sanitizeCalories(m.calories, ctx, warnings),
        proteinG: sanitizeMacroGram("protein", m.proteinG, ctx, warnings),
        carbsG: sanitizeMacroGram("carbs", m.carbsG, ctx, warnings),
        fatG: sanitizeMacroGram("fat", m.fatG, ctx, warnings),
      };
      return reconcileMacros(sanitized, ctx, warnings, strict);
    },
  );

  return { meals, warnings, emptyContentMeals };
}

interface MealGapAnalysis {
  warnings: string[];
  belowExpectedCount: boolean;
  allergenHits: { mealIndex: number; allergens: string[] }[];
  macroDrift: { calories?: number; protein?: number; carbs?: number; fat?: number };
}

function detectMealCountGap(
  sanitized: Pick<SanitizedDailyMeals, "meals">,
  minMealsExpected: number | undefined,
  warnings: string[],
): boolean {
  const below = minMealsExpected != null && sanitized.meals.length < minMealsExpected;
  if (below) {
    warnings.push(
      `meal count ${sanitized.meals.length} below expected minimum ${minMealsExpected}`,
    );
  }
  return below;
}

function detectAllergenHits(
  meals: DailyMealItem[],
  userAllergens: string[] | undefined,
  warnings: string[],
): { mealIndex: number; allergens: string[] }[] {
  if (!userAllergens || userAllergens.length === 0) return [];
  const hits: { mealIndex: number; allergens: string[] }[] = [];
  meals.forEach((m, i) => {
    const found = detectAllergens(m.content, userAllergens);
    if (found.length > 0) {
      hits.push({ mealIndex: i, allergens: found });
      warnings.push(`meal[${i}]: allergen match — ${found.join(", ")}`);
    }
  });
  return hits;
}

function detectMacroDrift(
  meals: DailyMealItem[],
  expected: DailyExpectedTargets | undefined,
  warnings: string[],
): { calories?: number; protein?: number; carbs?: number; fat?: number } {
  if (!expected) return {};
  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein: acc.protein + Number.parseFloat(m.proteinG ?? "0"),
      carbs: acc.carbs + Number.parseFloat(m.carbsG ?? "0"),
      fat: acc.fat + Number.parseFloat(m.fatG ?? "0"),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return computeMacroDrift(totals, expected, "daily", warnings);
}

/** Detects count/quality gaps + allergen hits + macro drift. */
export function detectMealGaps(
  sanitized: Pick<SanitizedDailyMeals, "meals">,
  options: Pick<
    ValidateDailyMealsOptions,
    "minMealsExpected" | "expectedTargets" | "userAllergens"
  >,
): MealGapAnalysis {
  const warnings: string[] = [];
  const belowExpectedCount = detectMealCountGap(sanitized, options.minMealsExpected, warnings);
  const allergenHits = detectAllergenHits(sanitized.meals, options.userAllergens, warnings);
  const macroDrift = detectMacroDrift(sanitized.meals, options.expectedTargets, warnings);
  return { warnings, belowExpectedCount, allergenHits, macroDrift };
}

export function validateDailyMealArray(
  data: unknown,
  options: ValidateDailyMealsOptions = {},
): ValidateDailyMealsResult {
  const sanitized = sanitizeDailyMeals(data, options);
  const gaps = detectMealGaps(sanitized, options);
  const warnings = [...sanitized.warnings, ...gaps.warnings];
  if (warnings.length > 0) {
    console.warn(`[validateDailyMealArray] ${warnings.length} warning(s):`, warnings);
  }
  return {
    meals: sanitized.meals,
    warnings,
    emptyContentMeals: sanitized.emptyContentMeals,
    belowExpectedCount: gaps.belowExpectedCount,
    allergenHits: gaps.allergenHits,
    macroDrift: gaps.macroDrift,
  };
}

export function dailyMealsNeedRetry(result: ValidateDailyMealsResult): boolean {
  return (
    result.belowExpectedCount ||
    result.emptyContentMeals.length > 0 ||
    result.allergenHits.length > 0 ||
    Object.keys(result.macroDrift).length > 0
  );
}

/** Sums gap signals into a single quality score (lower = better). */
export function scoreMealValidationGaps(result: ValidateDailyMealsResult): number {
  return (
    (result.belowExpectedCount ? 1 : 0) +
    result.emptyContentMeals.length +
    result.allergenHits.length +
    Object.keys(result.macroDrift).length
  );
}

export function buildDailyMealsRetryNudge(
  result: ValidateDailyMealsResult,
  minExpected?: number,
  expectedTargets?: DailyExpectedTargets,
): string {
  const issues: string[] = [];
  if (result.belowExpectedCount && minExpected) {
    issues.push(
      `ÖĞÜN SAYISI YETERSİZ: ${result.meals.length} öğün döndün, EN AZ ${minExpected} öğün gerek.`,
    );
  }
  if (result.emptyContentMeals.length > 0) {
    issues.push(
      `BOŞ İÇERİK ÖĞÜNLERİ: index ${result.emptyContentMeals.join(", ")}. Bu öğünlere malzeme + hazırlık tarifi ekle.`,
    );
  }
  if (result.allergenHits.length > 0) {
    const flat = result.allergenHits
      .map((h) => `index ${h.mealIndex}: ${h.allergens.join(", ")}`)
      .join(" | ");
    issues.push(
      `ALERJEN İHLALİ: ${flat}. Bu malzemeleri KESİNLİKLE değiştir — alerjenleri alternatif gıdalarla ikame et.`,
    );
  }
  if (Object.keys(result.macroDrift).length > 0 && expectedTargets) {
    const parts: string[] = [];
    if (result.macroDrift.calories != null && expectedTargets.calories) {
      parts.push(`kcal hedef ${expectedTargets.calories}`);
    }
    if (result.macroDrift.protein != null && expectedTargets.protein) {
      parts.push(`protein hedef ${expectedTargets.protein}g`);
    }
    if (result.macroDrift.carbs != null && expectedTargets.carbs) {
      parts.push(`karb hedef ${expectedTargets.carbs}g`);
    }
    if (result.macroDrift.fat != null && expectedTargets.fat) {
      parts.push(`yağ hedef ${expectedTargets.fat}g`);
    }
    issues.push(
      `MAKRO HEDEF SAPMASI: günlük toplam tolerans dışında (${parts.join(", ")}). Porsiyon/içerik ayarla.`,
    );
  }
  return `\n\nÖNCEKİ YANITINDA ŞU SORUNLAR VAR — DÜZELT:\n${issues.join("\n")}\nTüm öğünleri dolu içerikle EKSİKSİZ döndür.`;
}

// ─── Exercise array ────────────────────────────────────────────────────────

export interface DailyExerciseItem {
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

export interface ValidateDailyExercisesOptions {
  /** Required sections. If any missing, retry is triggered. Default: none. */
  requiredSections?: string[];
  /**
   * Force every exercise's section to this single value. Used by section-
   * replacement (drop out-of-section results). Mismatches are warnings.
   */
  forcedSection?: string;
  /**
   * Force a sectionLabel rewrite alongside `forcedSection`. Otherwise the
   * raw sectionLabel from AI is preserved.
   */
  forcedSectionLabel?: string;
  /** Minimum exercise count below which a retry is suggested. */
  minExerciseCount?: number;
}

export interface ValidateDailyExercisesResult {
  exercises: DailyExerciseItem[];
  warnings: string[];
  /** Sections required but absent in the response. */
  missingSections: string[];
  /** True when exercises.length < minExerciseCount. */
  belowExpectedCount: boolean;
  /** Exercises whose name was empty (dropped from output). */
  droppedForEmptyName: number;
  /** Standard moves missing englishName. */
  missingEnglishName: number[];
}

interface SanitizedDailyExercises {
  exercises: DailyExerciseItem[];
  warnings: string[];
  droppedForEmptyName: number;
  missingEnglishName: number[];
}

/**
 * Pure sanitize pass for daily exercise array. Drops empty-name and
 * forced-section mismatches, records missing-englishName warnings.
 * Throws on parse-format failure.
 */
export function sanitizeDailyExercises(
  data: unknown,
  options: Pick<ValidateDailyExercisesOptions, "forcedSection" | "forcedSectionLabel"> = {},
): SanitizedDailyExercises {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.exercises)) {
    throw new Error("Invalid response format: expected { exercises: [...] }");
  }

  const warnings: string[] = [];
  const missingEnglishName: number[] = [];
  let droppedForEmptyName = 0;

  const exercises: DailyExerciseItem[] = (obj.exercises as Record<string, unknown>[])
    .map((ex, i): DailyExerciseItem | null => {
      const ctx = `exercise[${i}]`;
      const name = safeString(ex.name).trim();
      if (name === "") {
        warnings.push(`${ctx}: empty name → dropped`);
        droppedForEmptyName += 1;
        return null;
      }

      const englishName = safeNullableText(ex.englishName);
      if (englishName == null) {
        // Standard moves should always have englishName per O3 rule. We
        // can't tell if this is a custom user move from server-side, so we
        // just flag and let the caller decide.
        missingEnglishName.push(i);
        warnings.push(`${ctx} ("${name}"): missing englishName`);
      }

      let section = sanitizeSection(ex.section, ctx, warnings);
      let sectionLabel = safeString(ex.sectionLabel, "Ana Antrenman");

      if (options.forcedSection && section !== options.forcedSection) {
        warnings.push(
          `${ctx}: section "${section}" ≠ forced "${options.forcedSection}" → dropped`,
        );
        return null;
      }
      if (options.forcedSection && options.forcedSectionLabel) {
        section = options.forcedSection;
        sectionLabel = options.forcedSectionLabel;
      }

      return {
        section,
        sectionLabel,
        name,
        englishName,
        sets: safeInteger(ex.sets),
        reps: safeNullableText(ex.reps),
        restSeconds: sanitizeRestSeconds(ex.restSeconds, ctx, warnings),
        durationMinutes: sanitizeDurationMinutes(ex.durationMinutes, ctx, warnings),
        notes: safeNullableText(ex.notes),
      };
    })
    .filter((ex): ex is DailyExerciseItem => ex !== null);

  return { exercises, warnings, droppedForEmptyName, missingEnglishName };
}

interface ExerciseGapAnalysis {
  warnings: string[];
  missingSections: string[];
  belowExpectedCount: boolean;
}

/** Detects section/count gaps in a sanitized exercise array. */
export function detectExerciseGaps(
  sanitized: Pick<SanitizedDailyExercises, "exercises">,
  options: Pick<ValidateDailyExercisesOptions, "requiredSections" | "minExerciseCount">,
): ExerciseGapAnalysis {
  const warnings: string[] = [];
  const presentSections = new Set(sanitized.exercises.map((e) => e.section));
  const missingSections: string[] = [];
  for (const req of options.requiredSections ?? []) {
    if (!presentSections.has(req)) {
      missingSections.push(req);
      warnings.push(`required section "${req}" missing from response`);
    }
  }

  const belowExpectedCount =
    options.minExerciseCount != null &&
    sanitized.exercises.length < options.minExerciseCount;
  if (belowExpectedCount) {
    warnings.push(
      `exercise count ${sanitized.exercises.length} below expected minimum ${options.minExerciseCount}`,
    );
  }
  return { warnings, missingSections, belowExpectedCount };
}

export function validateDailyExerciseArray(
  data: unknown,
  options: ValidateDailyExercisesOptions = {},
): ValidateDailyExercisesResult {
  const sanitized = sanitizeDailyExercises(data, options);
  const gaps = detectExerciseGaps(sanitized, options);
  const warnings = [...sanitized.warnings, ...gaps.warnings];
  if (warnings.length > 0) {
    console.warn(`[validateDailyExerciseArray] ${warnings.length} warning(s):`, warnings);
  }
  return {
    exercises: sanitized.exercises,
    warnings,
    missingSections: gaps.missingSections,
    belowExpectedCount: gaps.belowExpectedCount,
    droppedForEmptyName: sanitized.droppedForEmptyName,
    missingEnglishName: sanitized.missingEnglishName,
  };
}

export function dailyExercisesNeedRetry(
  result: ValidateDailyExercisesResult,
): boolean {
  return (
    result.missingSections.length > 0 ||
    result.belowExpectedCount ||
    result.droppedForEmptyName > 0
  );
}

/** Sums gap signals into a single quality score (lower = better). */
export function scoreExerciseValidationGaps(
  result: ValidateDailyExercisesResult,
): number {
  return (
    result.missingSections.length +
    (result.belowExpectedCount ? 1 : 0) +
    result.droppedForEmptyName
  );
}

export function buildDailyExercisesRetryNudge(
  result: ValidateDailyExercisesResult,
  minExpected?: number,
): string {
  const issues: string[] = [];
  if (result.missingSections.length > 0) {
    issues.push(
      `EKSİK SECTION'LAR: ${result.missingSections.join(", ")}. Bu section'lar için en az 1 egzersiz ekle.`,
    );
  }
  if (result.belowExpectedCount && minExpected) {
    issues.push(
      `EGZERSİZ SAYISI YETERSİZ: ${result.exercises.length} egzersiz döndün, EN AZ ${minExpected} gerek.`,
    );
  }
  if (result.droppedForEmptyName > 0) {
    issues.push(
      `${result.droppedForEmptyName} egzersizin name alanı boştu (atıldı). Tüm egzersizler için "name" alanını DOLDUR.`,
    );
  }
  return `\n\nÖNCEKİ YANITINDA ŞU SORUNLAR VAR — DÜZELT:\n${issues.join("\n")}\nEKSİKSİZ JSON döndür.`;
}
