/**
 * Daily meal generation core, split out of the `generateDailyMeals` server
 * action so it can also run outside a request (the plan eval harness). The
 * action keeps auth, rate limiting, ownership and usage logging; this module
 * never logs or persists anything.
 *
 *   prepareDailyMeals  — load context, resolve targets, build the prompt.
 *   executeDailyMeals  — AI call + retries + the deterministic floor net.
 */

import "server-only";
import { db } from "@/db";
import { meals, users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { AIMeal } from "@/actions/ai-meals";
import type { Locale } from "@/lib/locale";
import {
  callAIText,
  executeAIWithRetries,
  type AIEffort,
  type ExecuteResult,
} from "@/lib/ai-runtime";
import { AI_EFFORT, AI_MAX_TOKENS, AI_RETRY_TIMEOUT_MS, AI_TIMEOUTS } from "@/lib/ai-config";
import { DAILY_MEALS_ENGINE_SCHEMA } from "@/lib/ai-output-schemas";
import { applyMacroEngine } from "@/lib/macro-engine";
import { buildDailyMealPrompt } from "@/lib/ai-prompt-builders";
import { getDailyMealsPrompt, getNutritionOnlyMealsPrompt } from "@/lib/ai-prompts";
import { buildMealContext } from "@/lib/ai-meal-context";
import { resolveTargetsForDay } from "@/lib/macro-targets";
import {
  getDailySupplementBudget,
  subtractSupplementBudget,
} from "@/lib/supplement-budget";
import {
  validateDailyMealArray,
  buildDailyMealsRetryNudge,
  scoreMealValidationGaps,
  type ValidateDailyMealsOptions,
  type ValidateDailyMealsResult,
} from "@/lib/ai-daily-validators";
import { parseAiJson } from "@/lib/ai-json-repair";
import { parseUserAllergens } from "@/lib/allergen-detect";
import { enforceMealFloors } from "@/lib/ai-weekly-postprocess";

type SupplementBudget = Awaited<ReturnType<typeof getDailySupplementBudget>>;

export interface PrepareDailyMealsInput {
  userId: string;
  locale: Locale;
  dailyPlanId: number;
  userNote?: string;
}

export interface PreparedDailyMeals {
  locale: Locale;
  systemPrompt: string;
  userMessage: string;
  /** The day's meals before regeneration, for the comparison view. */
  currentMeals: AIMeal[];
  planType: string | null;
  isNutritionOnly: boolean;
  targets: ReturnType<typeof subtractSupplementBudget> | null;
  supplementBudget: SupplementBudget;
  bodyWeightKg: number | null;
  minMealsExpected: number;
  userAllergens: ValidateDailyMealsOptions["userAllergens"];
  expectedTargets: ValidateDailyMealsOptions["expectedTargets"];
}

export async function prepareDailyMeals(
  input: PrepareDailyMealsInput,
): Promise<PreparedDailyMeals> {
  const { userId, locale, dailyPlanId, userNote } = input;

  // Get current meals for comparison display
  const currentMealRows = await db
    .select()
    .from(meals)
    .where(eq(meals.dailyPlanId, dailyPlanId))
    .orderBy(asc(meals.sortOrder));

  const currentMeals: AIMeal[] = currentMealRows.map((m) => ({
    mealTime: m.mealTime,
    mealLabel: m.mealLabel,
    content: m.content,
    calories: m.calories ?? null,
    proteinG: m.proteinG ?? null,
    carbsG: m.carbsG ?? null,
    fatG: m.fatG ?? null,
  }));

  // Get user profile (service type for prompt + macro fields for targets +
  // foodAllergens for post-gen guard)
  const [userRow] = await db
    .select({
      serviceType: users.serviceType,
      weight: users.weight,
      targetWeight: users.targetWeight,
      height: users.height,
      age: users.age,
      gender: users.gender,
      dailyActivityLevel: users.dailyActivityLevel,
      fitnessGoal: users.fitnessGoal,
      targetCalories: users.targetCalories,
      targetProteinG: users.targetProteinG,
      targetCarbsG: users.targetCarbsG,
      targetFatG: users.targetFatG,
      targetCalorieDelta: users.targetCalorieDelta,
      targetProteinPerKg: users.targetProteinPerKg,
      targetFatPct: users.targetFatPct,
      foodAllergens: users.foodAllergens,
    })
    .from(users)
    .where(eq(users.id, userId));
  const isNutritionOnly = userRow?.serviceType === "nutrition";
  const systemPrompt = isNutritionOnly
    ? getNutritionOnlyMealsPrompt(locale)
    : getDailyMealsPrompt(locale);

  const { context: mealContext, totalMealsTarget, planType, weeklyPlanId } = await buildMealContext(dailyPlanId, userId);

  const rawTargets = userRow ? await resolveTargetsForDay(userRow, userId, planType) : null;
  const supplementBudget = await getDailySupplementBudget(userId, weeklyPlanId);
  const targets = rawTargets
    ? subtractSupplementBudget(rawTargets, supplementBudget)
    : null;

  const userMessage = buildDailyMealPrompt({
    locale,
    mealContext,
    targets,
    isNutritionOnly,
    userNote: userNote ?? null,
    currentMeals: currentMeals.length > 0
      ? currentMeals.map((m) => ({
          mealTime: m.mealTime,
          mealLabel: m.mealLabel,
          content: m.content,
        }))
      : undefined,
    supplementBudget,
  });

  // Use the meal-timing policy's totalMealsTarget when available — it already
  // factors serviceType, goal, age, and health flags. Fallback floor of 3 when
  // no user row / policy could be derived.
  const minMealsExpected = totalMealsTarget ?? 3;
  const userAllergens = parseUserAllergens(userRow?.foodAllergens);
  const expectedTargets = targets
    ? {
        calories: targets.calories,
        protein: targets.protein,
        carbs: targets.carbs,
        fat: targets.fat,
      }
    : undefined;

  return {
    locale,
    systemPrompt,
    userMessage,
    currentMeals,
    planType,
    isNutritionOnly,
    targets,
    supplementBudget,
    bodyWeightKg: userRow?.weight ? parseFloat(userRow.weight) : null,
    minMealsExpected,
    userAllergens,
    expectedTargets,
  };
}

/** Drift the engine's portion limits couldn't close — worth one retry. */
const ENGINE_RETRY_DRIFT = 0.25;

/**
 * The engine scales portions onto the targets, so macro drift alone no
 * longer warrants a retry; structural gaps (too few meals, empty content,
 * allergens) or a drift beyond the portion limits still do.
 */
function needsRetryWithEngine(r: ValidateDailyMealsResult): boolean {
  return (
    r.belowExpectedCount ||
    r.emptyContentMeals.length > 0 ||
    r.allergenHits.length > 0 ||
    Object.values(r.macroDrift).some((v) => (v ?? 0) > ENGINE_RETRY_DRIFT)
  );
}

export interface DailyMealsOutcome {
  suggestedMeals: AIMeal[];
  warnings: string[];
  exec: ExecuteResult<ValidateDailyMealsResult>;
}

export async function executeDailyMeals(
  prep: PreparedDailyMeals,
  opts: { effort?: AIEffort } = {},
): Promise<DailyMealsOutcome> {
  const { locale, userMessage, minMealsExpected, expectedTargets } = prep;
  const validatorOpts: ValidateDailyMealsOptions = {
    minMealsExpected,
    userAllergens: prep.userAllergens,
    expectedTargets,
  };

  const callOpts = {
    systemPrompt: prep.systemPrompt,
    maxTokens: AI_MAX_TOKENS.dailyMeal,
    model: "smart" as const,
    effort: opts.effort ?? AI_EFFORT.dailyMeal,
    outputSchema: DAILY_MEALS_ENGINE_SCHEMA,
    // Applies to the initial call; retries and the parse-fail call override it.
    timeoutMs: AI_TIMEOUTS.dailyMealCall,
  };
  const parseFailureAddendum = locale === "en"
    ? `\n\nPREVIOUS RESPONSE RETURNED INVALID JSON. Keep recipes SHORT (one sentence). Reply with valid JSON only: { "meals": [...] }`
    : `\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Tarifleri KISA tut (tek cümle). Sadece geçerli JSON yanıt ver: { "meals": [...] }`;

  // The model lists ingredients; the engine computes macros, scales portions
  // onto the day's targets and renders the recipe — then the usual validator
  // runs on the result. Engine telemetry goes first in the warning list.
  const consumeWithEngine = (text: string) => {
    const engineWarnings: string[] = [];
    const parsed = parseAiJson(text) as { meals?: unknown };
    const input = Array.isArray(parsed?.meals)
      ? {
          meals: applyMacroEngine(
            parsed.meals as Record<string, unknown>[],
            expectedTargets,
            locale,
            engineWarnings,
          ),
        }
      : parsed;
    const result = validateDailyMealArray(input, validatorOpts);
    result.warnings.unshift(...engineWarnings);
    return result;
  };

  const exec = await executeAIWithRetries({
    userMessage,
    initial: () => callAIText({ ...callOpts, userMessage }),
    retry: (msg, step) => callAIText({ ...callOpts, userMessage: msg, timeoutMs: step.timeoutMs }),
    consume: (raw) => consumeWithEngine(raw.text),
    onParseFailure: async () => {
      const raw = await callAIText({
        ...callOpts,
        userMessage: `${userMessage}${parseFailureAddendum}`,
        timeoutMs: AI_RETRY_TIMEOUT_MS.dailyMeal,
      });
      return { raw, result: consumeWithEngine(raw.text) };
    },
    retries: [
      {
        buildRetryMessage: (current) =>
          needsRetryWithEngine(current)
            ? buildDailyMealsRetryNudge(current, minMealsExpected, expectedTargets)
            : null,
        shouldKeep: (prev, candidate) =>
          scoreMealValidationGaps(candidate) < scoreMealValidationGaps(prev),
        timeoutMs: AI_RETRY_TIMEOUT_MS.dailyMeal,
      },
    ],
    score: scoreMealValidationGaps,
  });

  const validation = exec.result;
  const suggestedMeals: AIMeal[] = validation.meals;

  // Deterministic protein/fat floor net (the last word after the AI + its
  // retries — mirrors the weekly flow). A single-day regen must not collapse
  // protein/fat; if it falls short of the supplement-adjusted floor we append
  // one standardized "Macro Top-Up" meal to close the gap. Mutates in place.
  const mealCountBeforeFloor = suggestedMeals.length;
  const isTrainingDay = prep.planType === "workout" || prep.planType === "swimming";
  // Only offer whey to users who take protein powder and aren't nutrition-only.
  const useProteinPowder = prep.supplementBudget.hasProteinPowder && !prep.isNutritionOnly;
  enforceMealFloors(suggestedMeals, prep.targets, prep.bodyWeightKg, locale, {
    isTrainingDay,
    useProteinPowder,
    // Training day + whey user → always surface a visible post-workout shake.
    forceWhey: isTrainingDay && useProteinPowder,
  });
  if (suggestedMeals.length > mealCountBeforeFloor) {
    validation.warnings.push(
      "[daily-macro-floor] appended Macro Top-Up meal to meet the protein/fat floor",
    );
  }

  return { suggestedMeals, warnings: validation.warnings, exec };
}
