"use server";

import { db } from "@/db";
import { meals, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { getAIClient, AI_MODELS, checkRateLimit } from "@/lib/ai";
import { verifyDailyPlanOwnership } from "@/lib/ownership";
import { DAILY_MEALS_PROMPT, NUTRITION_ONLY_MEALS_PROMPT } from "@/lib/ai-prompts";
import { buildMealContext } from "@/lib/ai-meal-context";

export interface AIMeal {
  mealTime: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

function parseJSON(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
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
  checkRateLimit(user.id, "daily-meal");
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  // Get user's service type for prompt selection
  const [userRow] = await db
    .select({ serviceType: users.serviceType })
    .from(users)
    .where(eq(users.id, user.id));
  const isNutritionOnly = userRow?.serviceType === "nutrition";
  const systemPrompt = isNutritionOnly ? NUTRITION_ONLY_MEALS_PROMPT : DAILY_MEALS_PROMPT;

  const { context: mealContext } = await buildMealContext(dailyPlanId, user.id);

  let userMessage = isNutritionOnly
    ? `${mealContext}\n\nBu gün için beslenme programı oluştur. Vücut kompozisyonunu, kilo trendini, yaşam tarzını ve önceki günlerin öğün düzenini dikkate al.`
    : `${mealContext}\n\nBu gün için beslenme programı oluştur. Antrenman yoğunluğunu, vücut kompozisyonunu, kilo trendini ve önceki günlerin öğün düzenini dikkate al.`;

  if (userNote?.trim()) {
    userMessage += `\n\n═══ KULLANICI İSTEĞİ ═══\nKullanıcı bu öğün planı için şunları belirtti: ${userNote.trim()}\nBu isteği mutlaka dikkate al.`;
  }

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

    let text = message.content[0].type === "text" ? message.content[0].text : "";

    let suggestedMeals: AIMeal[];
    try {
      suggestedMeals = validateMealArray(parseJSON(text));
    } catch {
      const retry = await client.messages.create({
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
            content: `${userMessage}\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "meals": [...] }`,
          },
        ],
      });
      text = retry.content[0].type === "text" ? retry.content[0].text : "";
      suggestedMeals = validateMealArray(parseJSON(text));
    }

    return { suggestedMeals };
  } catch (error) {
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
        mealLabel: m.mealLabel,
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
