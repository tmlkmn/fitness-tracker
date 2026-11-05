"use server";

import { db } from "@/db";
import { aiDailyMealSuggestions } from "@/db/schema";
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
import { buildExecMetadata } from "@/lib/ai-runtime";
import { userFacingWarnings } from "@/lib/ai-warning-telemetry";
import { prepareDailyMeals, executeDailyMeals } from "@/lib/ai-daily-meal-service";
import { replaceMealsForDay } from "@/lib/ai-persistence";
import { verifyDailyPlanOwnership } from "@/lib/ownership";
import { getUserLocale } from "@fitmusc/shared/locale";

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

  const prep = await prepareDailyMeals({
    userId: user.id,
    locale: getUserLocale(user),
    dailyPlanId,
    userNote,
  });

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const { suggestedMeals, warnings, exec } = await executeDailyMeals(prep);
    inputTokens = exec.inputTokens;
    outputTokens = exec.outputTokens;

    // Macro-engine notes stay in telemetry; the user sees real warnings only.
    const shownWarnings = userFacingWarnings(warnings);
    const hasWarnings = shownWarnings.length > 0;

    await logAiUsage(user.id, "daily-meal", {
      status: hasWarnings ? "success_with_warnings" : "success",
      errorMessage: buildExecMetadata(exec, warnings),
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    return {
      suggestedMeals,
      currentMeals: prep.currentMeals,
      validationWarnings: shownWarnings,
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
