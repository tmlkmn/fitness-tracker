"use server";

import { db } from "@/db";
import { exerciseTips, meals, dailyPlans } from "@/db/schema";
import { and, eq, gte, asc, ne } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { getAIClient, AI_MODELS, checkRateLimit, logAiUsage } from "@/lib/ai";
import { buildUserContext, getMealMacroBudget } from "@/lib/ai-context";
import {
  MEAL_VARIATION_PROMPT,
  EXERCISE_TIPS_PROMPT,
} from "@/lib/ai-prompts";

const TIPS_TTL_DAYS = 30;

export interface MealVariationSuggestion {
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

function parseJSON(text: string): unknown {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  return JSON.parse(cleaned);
}

export async function generateMealVariation(
  mealLabel: string,
  currentContent: string,
  calories?: number | null,
  proteinG?: string | null,
  carbsG?: string | null,
  fatG?: string | null,
  mealId?: number | null,
  previousSuggestions?: string[],
  userNote?: string | null
): Promise<{ suggestions: MealVariationSuggestion[] }> {
  const user = await getAuthUser();
  await checkRateLimit(user.id, "meal");
  await logAiUsage(user.id, "meal");

  const userContext = await buildUserContext(user.id);

  const macroInfo = [
    calories ? `${calories} kcal` : null,
    proteinG ? `Protein: ${proteinG}g` : null,
    carbsG ? `Karb: ${carbsG}g` : null,
    fatG ? `Yağ: ${fatG}g` : null,
  ]
    .filter(Boolean)
    .join(", ");

  // Build week context: what other meals of the same label exist this week
  let weekContext = "";
  let planTypeContext = "";
  let budgetContext = "";
  if (mealId) {
    try {
      const [currentMeal] = await db
        .select({ dailyPlanId: meals.dailyPlanId })
        .from(meals)
        .where(eq(meals.id, mealId));

      if (currentMeal?.dailyPlanId) {
        try {
          const budget = await getMealMacroBudget(user.id, currentMeal.dailyPlanId, mealId);
          if (budget.text) {
            budgetContext = `\n\n${budget.text}`;
          }
        } catch {
          // Best effort — proceed without budget
        }

        const [currentDay] = await db
          .select({ weeklyPlanId: dailyPlans.weeklyPlanId, planType: dailyPlans.planType })
          .from(dailyPlans)
          .where(eq(dailyPlans.id, currentMeal.dailyPlanId));

        if (currentDay?.planType) {
          const planTypeLabels: Record<string, string> = {
            workout: "Antrenman günü",
            rest: "Dinlenme günü",
            swimming: "Yüzme günü",
            nutrition: "Beslenme günü",
          };
          planTypeContext = `\nGünün tipi: ${planTypeLabels[currentDay.planType] ?? currentDay.planType}`;
        }

        if (currentDay?.weeklyPlanId) {
          const sameLabelRows = await db
            .select({
              dayName: dailyPlans.dayName,
              dayOfWeek: dailyPlans.dayOfWeek,
              mealTime: meals.mealTime,
              content: meals.content,
            })
            .from(meals)
            .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
            .where(
              and(
                eq(dailyPlans.weeklyPlanId, currentDay.weeklyPlanId),
                eq(meals.mealLabel, mealLabel),
                ne(meals.id, mealId),
              ),
            )
            .orderBy(asc(dailyPlans.dayOfWeek), asc(meals.mealTime));

          if (sameLabelRows.length > 0) {
            const sameLabelMeals = sameLabelRows.map(
              (r) => `${r.dayName}: ${r.content}`,
            );
            weekContext = `\n\nBu hafta aynı öğün tipinde (${mealLabel}) zaten şunlar var, bunları TEKRARLAMA:\n${sameLabelMeals.join("\n")}`;
          }
        }
      }
    } catch {
      // Best effort — proceed without week context
    }
  }

  // Build previous suggestions context
  let prevContext = "";
  if (previousSuggestions && previousSuggestions.length > 0) {
    prevContext = `\n\nDaha önce bu öğün için şu öneriler yapıldı, bunları TEKRARLAMA:\n${previousSuggestions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }

  // Build user note context — put up front as the top priority
  let noteHeader = "";
  if (userNote?.trim()) {
    noteHeader = `\n\n⚠️ KULLANICI İSTEĞİ (EN YÜKSEK ÖNCELİK — diğer tüm kurallardan önce gelir): ${userNote.trim()}`;
  }

  try {
    const client = getAIClient();
    const message = await client.messages.create({
      model: AI_MODELS.fast,
      max_tokens: 800,
      system: [
        {
          type: "text",
          text: MEAL_VARIATION_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `${userContext}${noteHeader}\n\nMevcut öğün: ${mealLabel} (öneriler AYNI öğün tipinde olmalı — kahvaltı için kahvaltılık, ana yemek için ana yemek)\nİçerik: ${currentContent}${macroInfo ? `\nMakrolar: ${macroInfo}` : ""}${planTypeContext}${budgetContext}${weekContext}${prevContext}\n\nBu öğüne benzer makrolarla, "${mealLabel}" öğün tipine uygun, birbirinden FARKLI 3 alternatif öneri yap.${userNote?.trim() ? ` Yukarıdaki KULLANICI İSTEĞİNİ tüm önerilerde birebir uygula; kullanıcı isteğiyle çelişen "farklı protein kaynağı" veya "farklı pişirme yöntemi" kuralları geçersizdir.` : " Her öneri farklı protein kaynağı ve farklı mutfak tarzı kullanmalı."} Eğer kalan makro bütçesi verilmişse, önerilerini bu bütçeye uyumlu yap. JSON formatında yanıt ver: { "suggestions": [{ "content": "...", "calories": number, "proteinG": "number", "carbsG": "number", "fatG": "number" }, ...] }`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const parsed = parseJSON(text) as Record<string, unknown>;
      const suggestionsRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed];
      const suggestions: MealVariationSuggestion[] = suggestionsRaw.map((s: Record<string, unknown>) => {
        let content = String(s.content ?? "");
        content = content.replace(/\n/g, ", ").replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim();
        content = content.replace(/^,\s*/, "").replace(/,\s*$/, "");
        return {
          content,
          calories: s.calories != null ? Number(s.calories) : null,
          proteinG: s.proteinG != null ? String(s.proteinG) : null,
          carbsG: s.carbsG != null ? String(s.carbsG) : null,
          fatG: s.fatG != null ? String(s.fatG) : null,
        };
      });
      return { suggestions };
    } catch {
      // Fallback: treat entire response as single suggestion
      return {
        suggestions: [{
          content: text,
          calories: calories ?? null,
          proteinG: proteinG ?? null,
          carbsG: carbsG ?? null,
          fatG: fatG ?? null,
        }],
      };
    }
  } catch (error) {
    console.error("[AI] Error generating meal variation:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}

async function callAIForTips(
  exerciseName: string,
  exerciseNotes: string | null,
  userContext: string,
) {
  const client = getAIClient();
  const message = await client.messages.create({
    model: AI_MODELS.fast,
    max_tokens: 600,
    system: [
      {
        type: "text",
        text: EXERCISE_TIPS_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `${userContext}\n\nEgzersiz: ${exerciseName}${exerciseNotes ? `\nEgzersiz notları: ${exerciseNotes}` : ""}\n\nBu egzersiz için doğru form ipuçları, nefes tekniği, hedef kas odağı ve yaygın hataları açıkla.`,
      },
    ],
  });
  return message.content[0].type === "text" ? message.content[0].text : "";
}

async function upsertTips(
  userId: string,
  nameNorm: string,
  notesNorm: string,
  tips: string,
) {
  await db
    .delete(exerciseTips)
    .where(
      and(
        eq(exerciseTips.userId, userId),
        eq(exerciseTips.exerciseNameNorm, nameNorm),
        eq(exerciseTips.exerciseNotes, notesNorm),
      ),
    );
  await db.insert(exerciseTips).values({
    userId,
    exerciseNameNorm: nameNorm,
    exerciseNotes: notesNorm,
    tips,
  });
}

export async function getExerciseFormTips(
  exerciseName: string,
  exerciseNotes: string | null,
) {
  const user = await getAuthUser();
  const nameNorm = exerciseName.toLowerCase().trim();
  const notesNorm = (exerciseNotes ?? "").trim();
  const ttlCutoff = new Date(Date.now() - TIPS_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Check DB for existing non-expired tips
  const [existing] = await db
    .select({ tips: exerciseTips.tips })
    .from(exerciseTips)
    .where(
      and(
        eq(exerciseTips.userId, user.id),
        eq(exerciseTips.exerciseNameNorm, nameNorm),
        eq(exerciseTips.exerciseNotes, notesNorm),
        gte(exerciseTips.createdAt, ttlCutoff),
      ),
    );

  if (existing) {
    return { tips: existing.tips };
  }

  // Rate limit before AI call
  await checkRateLimit(user.id, "exercise");
  await logAiUsage(user.id, "exercise");

  try {
    const userContext = await buildUserContext(user.id);
    const text = await callAIForTips(exerciseName, exerciseNotes, userContext);

    await upsertTips(user.id, nameNorm, notesNorm, text);

    return { tips: text };
  } catch (error) {
    console.error("[AI] Error generating exercise tips:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}

export async function regenerateExerciseFormTips(
  exerciseName: string,
  exerciseNotes: string | null,
) {
  const user = await getAuthUser();
  await checkRateLimit(user.id, "exercise");
  await logAiUsage(user.id, "exercise");

  const nameNorm = exerciseName.toLowerCase().trim();
  const notesNorm = (exerciseNotes ?? "").trim();

  try {
    const userContext = await buildUserContext(user.id);
    const text = await callAIForTips(exerciseName, exerciseNotes, userContext);

    await upsertTips(user.id, nameNorm, notesNorm, text);

    return { tips: text };
  } catch (error) {
    console.error("[AI] Error regenerating exercise tips:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}
