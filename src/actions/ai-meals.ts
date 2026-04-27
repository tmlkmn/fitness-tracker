"use server";

import { db } from "@/db";
import { meals, users, aiDailyMealSuggestions } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  getAIClient,
  AI_MODELS,
  checkRateLimit,
  logAiUsage,
  buildUserNotePriorityBlock,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import { verifyDailyPlanOwnership } from "@/lib/ownership";
import { DAILY_MEALS_PROMPT, NUTRITION_ONLY_MEALS_PROMPT } from "@/lib/ai-prompts";
import { buildMealContext } from "@/lib/ai-meal-context";
import { resolveTargets } from "@/lib/macro-targets";
import { coerceMealLabel } from "@/lib/meal-labels";

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

function parseJSON(text: string): unknown {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  return JSON.parse(cleaned);
}

function validateMealArray(data: unknown): AIMeal[] {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.meals)) {
    throw new Error("Invalid response format: expected { meals: [...] }");
  }
  return (obj.meals as Record<string, unknown>[]).map((m) => ({
    mealTime: String(m.mealTime ?? "08:00"),
    mealLabel: String(m.mealLabel ?? "Öğün"),
    content: String(m.content ?? ""),
    calories: m.calories != null ? Number(m.calories) : null,
    proteinG: m.proteinG != null ? String(m.proteinG) : null,
    carbsG: m.carbsG != null ? String(m.carbsG) : null,
    fatG: m.fatG != null ? String(m.fatG) : null,
  }));
}

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

  // Get user profile (service type for prompt + macro fields for targets)
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
    })
    .from(users)
    .where(eq(users.id, user.id));
  const isNutritionOnly = userRow?.serviceType === "nutrition";
  const systemPrompt = isNutritionOnly ? NUTRITION_ONLY_MEALS_PROMPT : DAILY_MEALS_PROMPT;

  const { context: mealContext } = await buildMealContext(dailyPlanId, user.id);

  // Compute resolved macro targets and inject as a separate block
  let targetsBlock = "";
  if (userRow) {
    const targets = await resolveTargets(userRow, user.id);
    if (targets) {
      targetsBlock = `\n\n═══ HESAPLANMIŞ GÜNLÜK MAKRO HEDEFLERİ ═══
Kalori: ${targets.calories} kcal
Protein: ${targets.protein}g
Karbonhidrat: ${targets.carbs}g
Yağ: ${targets.fat}g
Bu hedefler kullanıcının cinsiyet, yaş, kilo, boy, aktivite seviyesi ve fitness hedefine göre Mifflin-St Jeor + LBM bazlı hesaplanmıştır. Beslenme programı bu hedeflere ±%5 toleransla uymalı.`;
    }
  }

  let userMessage = isNutritionOnly
    ? `${mealContext}${targetsBlock}\n\nBu gün için beslenme programı oluştur. Vücut kompozisyonunu, kilo trendini, yaşam tarzını ve önceki günlerin öğün düzenini dikkate al.`
    : `${mealContext}${targetsBlock}\n\nBu gün için beslenme programı oluştur. Antrenman yoğunluğunu, vücut kompozisyonunu, kilo trendini ve önceki günlerin öğün düzenini dikkate al.`;

  if (userNote?.trim()) {
    userMessage += buildUserNotePriorityBlock(userNote);
  }

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const client = getAIClient();
    const message = await client.messages.create({
      model: AI_MODELS.smart,
      max_tokens: 2500,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    inputTokens = message.usage.input_tokens;
    outputTokens = message.usage.output_tokens;

    let text = message.content[0].type === "text" ? message.content[0].text : "";

    let suggestedMeals: AIMeal[];
    try {
      suggestedMeals = validateMealArray(parseJSON(text));
    } catch {
      // Retry with bigger budget + explicit conciseness nudge — most parse
      // failures here are truncations from chef-style content running long.
      const retry = await client.messages.create({
        model: AI_MODELS.smart,
        max_tokens: 3500,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `${userMessage}\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. İçerikleri KISA tut: content max 40 kelime, mekanik liste yerine tek cümle tarif. Sadece geçerli JSON yanıt ver: { "meals": [...] }`,
          },
        ],
      });
      inputTokens += retry.usage.input_tokens;
      outputTokens += retry.usage.output_tokens;
      text = retry.content[0].type === "text" ? retry.content[0].text : "";
      suggestedMeals = validateMealArray(parseJSON(text));
    }

    await logAiUsage(user.id, "daily-meal", {
      status: "success",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    return { suggestedMeals, currentMeals };
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

  // Delete existing meals for this day
  await db.delete(meals).where(eq(meals.dailyPlanId, dailyPlanId));

  // Insert new meals
  if (newMeals.length > 0) {
    await db.insert(meals).values(
      newMeals.map((m, i) => ({
        dailyPlanId,
        mealTime: m.mealTime,
        mealLabel: coerceMealLabel(m.mealLabel),
        content: m.content,
        calories: m.calories,
        proteinG: m.proteinG,
        carbsG: m.carbsG,
        fatG: m.fatG,
        isCompleted: false,
        sortOrder: i,
      })),
    );
  }

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
