"use server";

import { db } from "@/db";
import { meals, users, aiDailyMealSuggestions } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  AI_MODELS,
  checkRateLimit,
  logAiUsage,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import { callAIText, executeAIWithRetries, buildExecMetadata } from "@/lib/ai-runtime";
import { AI_MAX_TOKENS, AI_RETRY_TIMEOUT_MS } from "@/lib/ai-config";
import { buildDailyMealPrompt } from "@/lib/ai-prompt-builders";
import { replaceMealsForDay } from "@/lib/ai-persistence";
import { verifyDailyPlanOwnership } from "@/lib/ownership";
import { getDailyMealsPrompt, getNutritionOnlyMealsPrompt } from "@/lib/ai-prompts";
import { getUserLocale } from "@/lib/locale";
import { buildMealContext } from "@/lib/ai-meal-context";
import { resolveTargetsForDay } from "@/lib/macro-targets";
import {
  getDailySupplementBudget,
  subtractSupplementBudget,
} from "@/lib/supplement-budget";
import {
  validateDailyMealArray,
  dailyMealsNeedRetry,
  buildDailyMealsRetryNudge,
  scoreMealValidationGaps,
} from "@/lib/ai-daily-validators";
import { parseAiJson } from "@/lib/ai-json-repair";
import { parseUserAllergens } from "@/lib/allergen-detect";

export interface AIMeal {
  mealTime: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

const MAX_SAVED_DAILY_MEAL_SUGGESTIONS = 10;

export async function generateDailyMeals(dailyPlanId: number, userNote?: string) {
  const user = await getAuthUser();
  await checkRateLimit(user.id, "daily-meal");
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

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
      foodAllergens: users.foodAllergens,
    })
    .from(users)
    .where(eq(users.id, user.id));
  const isNutritionOnly = userRow?.serviceType === "nutrition";
  const locale = getUserLocale(user);
  const systemPrompt = isNutritionOnly
    ? getNutritionOnlyMealsPrompt(locale)
    : getDailyMealsPrompt(locale);

  const { context: mealContext, totalMealsTarget, planType, weeklyPlanId } = await buildMealContext(dailyPlanId, user.id);

  const rawTargets = userRow ? await resolveTargetsForDay(userRow, user.id, planType) : null;
  const supplementBudget = await getDailySupplementBudget(user.id, weeklyPlanId);
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

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
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
  const validatorOpts = { minMealsExpected, userAllergens, expectedTargets };

  try {
    const callOpts = {
      systemPrompt,
      maxTokens: AI_MAX_TOKENS.dailyMeal,
      model: "smart" as const,
    };
    const parseFailureAddendum = locale === "en"
      ? `\n\nPREVIOUS RESPONSE RETURNED INVALID JSON. Keep contents SHORT: content max 40 words, single-sentence recipe instead of mechanical list. Reply with valid JSON only: { "meals": [...] }`
      : `\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. İçerikleri KISA tut: content max 40 kelime, mekanik liste yerine tek cümle tarif. Sadece geçerli JSON yanıt ver: { "meals": [...] }`;

    const exec = await executeAIWithRetries({
      userMessage,
      initial: () => callAIText({ ...callOpts, userMessage }),
      retry: (msg, step) => callAIText({ ...callOpts, userMessage: msg, timeoutMs: step.timeoutMs }),
      consume: (raw) => validateDailyMealArray(parseAiJson(raw.text), validatorOpts),
      onParseFailure: async () => {
        const raw = await callAIText({
          ...callOpts,
          userMessage: `${userMessage}${parseFailureAddendum}`,
          timeoutMs: AI_RETRY_TIMEOUT_MS.dailyMeal,
        });
        return { raw, result: validateDailyMealArray(parseAiJson(raw.text), validatorOpts) };
      },
      retries: [
        {
          buildRetryMessage: (current) =>
            dailyMealsNeedRetry(current)
              ? buildDailyMealsRetryNudge(current, minMealsExpected, expectedTargets)
              : null,
          shouldKeep: (prev, candidate) =>
            scoreMealValidationGaps(candidate) < scoreMealValidationGaps(prev),
          timeoutMs: AI_RETRY_TIMEOUT_MS.dailyMeal,
        },
      ],
    });

    const validation = exec.result;
    inputTokens = exec.inputTokens;
    outputTokens = exec.outputTokens;

    const suggestedMeals: AIMeal[] = validation.meals;
    const hasWarnings = validation.warnings.length > 0;

    await logAiUsage(user.id, "daily-meal", {
      status: hasWarnings ? "success_with_warnings" : "success",
      errorMessage: buildExecMetadata(exec, validation.warnings),
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    return {
      suggestedMeals,
      currentMeals,
      validationWarnings: validation.warnings.slice(),
    };
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(user.id, "daily-meal", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    console.error("[AI Meals] Error generating daily meals:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}

export async function applyDailyMeals(
  dailyPlanId: number,
  newMeals: AIMeal[],
) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);
  await replaceMealsForDay(dailyPlanId, newMeals);
  revalidatePath("/");
}

// ─── Saved Daily Meal Suggestions ────────────────────────────────────────────

export async function saveDailyMealSuggestion(
  planType: string,
  mealList: AIMeal[],
  userNote?: string,
) {
  const user = await getAuthUser();

  // Enforce max limit — delete oldest if exceeded
  const existing = await db
    .select({ id: aiDailyMealSuggestions.id })
    .from(aiDailyMealSuggestions)
    .where(eq(aiDailyMealSuggestions.userId, user.id))
    .orderBy(asc(aiDailyMealSuggestions.createdAt));

  if (existing.length >= MAX_SAVED_DAILY_MEAL_SUGGESTIONS) {
    await db
      .delete(aiDailyMealSuggestions)
      .where(eq(aiDailyMealSuggestions.id, existing[0].id));
  }

  const [inserted] = await db
    .insert(aiDailyMealSuggestions)
    .values({
      userId: user.id,
      planType,
      userNote: userNote ?? null,
      meals: mealList,
    })
    .returning({ id: aiDailyMealSuggestions.id });

  return inserted;
}

export async function getSavedDailyMealSuggestions(planType?: string) {
  const user = await getAuthUser();

  const rows = await db
    .select()
    .from(aiDailyMealSuggestions)
    .where(
      planType
        ? and(
            eq(aiDailyMealSuggestions.userId, user.id),
            eq(aiDailyMealSuggestions.planType, planType),
          )
        : eq(aiDailyMealSuggestions.userId, user.id),
    )
    .orderBy(asc(aiDailyMealSuggestions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    planType: r.planType,
    userNote: r.userNote,
    meals: r.meals as AIMeal[],
    createdAt: r.createdAt,
  }));
}

export async function deleteSavedDailyMealSuggestion(id: number) {
  const user = await getAuthUser();

  await db
    .delete(aiDailyMealSuggestions)
    .where(
      and(
        eq(aiDailyMealSuggestions.id, id),
        eq(aiDailyMealSuggestions.userId, user.id),
      ),
    );
}
