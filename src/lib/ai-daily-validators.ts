/**
 * Validators for single-day AI generation flows (daily meals + daily workout).
 * Same warning + retry-trigger pattern as the weekly validator, scoped to one
 * day's worth of content.
 */

import {
  isStrictMacroValidationEnabled as defaultStrictMacroEnabled,
  passthroughMacro,
  reconcileMacros,
  sanitizeCalories,
  sanitizeDurationMinutes,
  sanitizeMealLabel,
  sanitizeProteinG,
  sanitizeRestSeconds,
  sanitizeSection,
} from "@/lib/ai-shape-validators";

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

export interface ValidateDailyMealsOptions {
  strictMacroValidation?: boolean;
  /**
   * Minimum number of meals expected for this day. Used to flag thin AI
   * responses that should trigger a retry (e.g., user policy says 5-7 meals
   * but AI only produced 3).
   */
  minMealsExpected?: number;
}

export interface ValidateDailyMealsResult {
  meals: DailyMealItem[];
  warnings: string[];
  /** Meals whose `content` is empty/whitespace — useless to user. */
  emptyContentMeals: number[];
  /** True when meals.length < minMealsExpected. */
  belowExpectedCount: boolean;
}

export function validateDailyMealArray(
  data: unknown,
  options: ValidateDailyMealsOptions = {},
): ValidateDailyMealsResult {
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
      const content = String(m.content ?? "").trim();
      if (content === "") {
        emptyContentMeals.push(i);
        warnings.push(`${ctx}: empty content`);
      }
      const sanitized: DailyMealItem = {
        mealTime: String(m.mealTime ?? "08:00"),
        mealLabel: sanitizeMealLabel(m.mealLabel, ctx, warnings),
        content,
        calories: sanitizeCalories(m.calories, ctx, warnings),
        proteinG: sanitizeProteinG(m.proteinG, ctx, warnings),
        carbsG: passthroughMacro(m.carbsG),
        fatG: passthroughMacro(m.fatG),
      };
      return reconcileMacros(sanitized, ctx, warnings, strict);
    },
  );

  const belowExpectedCount =
    options.minMealsExpected != null &&
    meals.length < options.minMealsExpected;
  if (belowExpectedCount) {
    warnings.push(
      `meal count ${meals.length} below expected minimum ${options.minMealsExpected}`,
    );
  }

  if (warnings.length > 0) {
    console.warn(`[validateDailyMealArray] ${warnings.length} warning(s):`, warnings);
  }

  return { meals, warnings, emptyContentMeals, belowExpectedCount };
}

export function dailyMealsNeedRetry(result: ValidateDailyMealsResult): boolean {
  return result.belowExpectedCount || result.emptyContentMeals.length > 0;
}

export function buildDailyMealsRetryNudge(
  result: ValidateDailyMealsResult,
  minExpected?: number,
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

export function validateDailyExerciseArray(
  data: unknown,
  options: ValidateDailyExercisesOptions = {},
): ValidateDailyExercisesResult {
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
      const name = String(ex.name ?? "").trim();
      if (name === "") {
        warnings.push(`${ctx}: empty name → dropped`);
        droppedForEmptyName += 1;
        return null;
      }

      const englishNameRaw = ex.englishName != null ? String(ex.englishName).trim() : "";
      const englishName = englishNameRaw !== "" ? englishNameRaw : null;
      if (englishName == null) {
        // Standard moves should always have englishName per O3 rule. We
        // can't tell if this is a custom user move from server-side, so we
        // just flag and let the caller decide.
        missingEnglishName.push(i);
        warnings.push(`${ctx} ("${name}"): missing englishName`);
      }

      let section = sanitizeSection(ex.section, ctx, warnings);
      let sectionLabel = String(ex.sectionLabel ?? "Ana Antrenman");

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
        sets: ex.sets != null ? Number(ex.sets) : null,
        reps: ex.reps != null ? String(ex.reps) : null,
        restSeconds: sanitizeRestSeconds(ex.restSeconds, ctx, warnings),
        durationMinutes: sanitizeDurationMinutes(ex.durationMinutes, ctx, warnings),
        notes: ex.notes != null ? String(ex.notes) : null,
      };
    })
    .filter((ex): ex is DailyExerciseItem => ex !== null);

  // Check required sections coverage
  const presentSections = new Set(exercises.map((e) => e.section));
  const missingSections: string[] = [];
  for (const req of options.requiredSections ?? []) {
    if (!presentSections.has(req)) {
      missingSections.push(req);
      warnings.push(`required section "${req}" missing from response`);
    }
  }

  const belowExpectedCount =
    options.minExerciseCount != null &&
    exercises.length < options.minExerciseCount;
  if (belowExpectedCount) {
    warnings.push(
      `exercise count ${exercises.length} below expected minimum ${options.minExerciseCount}`,
    );
  }

  if (warnings.length > 0) {
    console.warn(`[validateDailyExerciseArray] ${warnings.length} warning(s):`, warnings);
  }

  return {
    exercises,
    warnings,
    missingSections,
    belowExpectedCount,
    droppedForEmptyName,
    missingEnglishName,
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
