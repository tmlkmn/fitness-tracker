"use server";

import { db } from "@/db";
import { exerciseTips, meals, dailyPlans } from "@/db/schema";
import { and, eq, gte, asc, ne } from "drizzle-orm";
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

export interface GenerateMealVariationOptions {
  mealLabel: string;
  currentContent: string;
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
  mealId?: number | null;
  dailyPlanId?: number | null;
  previousSuggestions?: string[];
  userNote?: string | null;
}

const PREVIOUS_SUGGESTIONS_MAX = 5;

export async function generateMealVariation(
  options: GenerateMealVariationOptions,
): Promise<{ suggestions: MealVariationSuggestion[] }> {
  const {
    mealLabel,
    currentContent,
    calories,
    proteinG,
    carbsG,
    fatG,
    mealId,
    dailyPlanId: dailyPlanIdOpt,
    previousSuggestions,
    userNote,
  } = options;
  const user = await getAuthUser();
  await checkRateLimit(user.id, "meal");

  const userContext = await buildUserContext(user.id);

  const macroInfo = [
    calories ? `${calories} kcal` : null,
    proteinG ? `Protein: ${proteinG}g` : null,
    carbsG ? `Karb: ${carbsG}g` : null,
    fatG ? `Yağ: ${fatG}g` : null,
  ]
    .filter(Boolean)
    .join(", ");

  // Resolve the dailyPlanId either from the meal row (when mealId is known)
  // or directly from the caller (when the user is adding a brand-new meal
  // that hasn't been persisted yet — N2 fix: budget must still apply).
  let resolvedDailyPlanId: number | null = dailyPlanIdOpt ?? null;
  if (!resolvedDailyPlanId && mealId) {
    try {
      const [currentMeal] = await db
        .select({ dailyPlanId: meals.dailyPlanId })
        .from(meals)
        .where(eq(meals.id, mealId));
      resolvedDailyPlanId = currentMeal?.dailyPlanId ?? null;
    } catch {
      // Best effort
    }
  }

  // Build week context: what other meals of the same label exist this week
  let weekContext = "";
  let planTypeContext = "";
  let budgetContext = "";
  if (resolvedDailyPlanId) {
    try {
      try {
        const budget = await getMealMacroBudget(user.id, resolvedDailyPlanId, mealId ?? null);
        if (budget.text) {
          budgetContext = `\n\n${budget.text}`;
        }
      } catch {
        // Best effort — proceed without budget
      }

      const [currentDay] = await db
        .select({ weeklyPlanId: dailyPlans.weeklyPlanId, planType: dailyPlans.planType })
        .from(dailyPlans)
        .where(eq(dailyPlans.id, resolvedDailyPlanId));

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
        const sameLabelWhere = mealId
          ? and(
              eq(dailyPlans.weeklyPlanId, currentDay.weeklyPlanId),
              eq(meals.mealLabel, mealLabel),
              ne(meals.id, mealId),
            )
          : and(
              eq(dailyPlans.weeklyPlanId, currentDay.weeklyPlanId),
              eq(meals.mealLabel, mealLabel),
            );
        const sameLabelRows = await db
          .select({
            dayName: dailyPlans.dayName,
            dayOfWeek: dailyPlans.dayOfWeek,
            mealTime: meals.mealTime,
            content: meals.content,
          })
          .from(meals)
          .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
          .where(sameLabelWhere)
          .orderBy(asc(dailyPlans.dayOfWeek), asc(meals.mealTime));

        if (sameLabelRows.length > 0) {
          const sameLabelMeals = sameLabelRows.map(
            (r) => `${r.dayName}: ${r.content}`,
          );
          weekContext = `\n\nBu hafta aynı öğün tipinde (${mealLabel}) zaten şunlar var, bunları TEKRARLAMA:\n${sameLabelMeals.join("\n")}`;
        }
      }
    } catch {
      // Best effort — proceed without week context
    }
  }

  // Build previous suggestions context — cap at last N to avoid token blowup
  let prevContext = "";
  if (previousSuggestions && previousSuggestions.length > 0) {
    const recent = previousSuggestions.slice(-PREVIOUS_SUGGESTIONS_MAX);
    prevContext = `\n\nDaha önce bu öğün için şu öneriler yapıldı, bunları TEKRARLAMA:\n${recent.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }

  // Build user message — note priority block is appended at the end so it
  // sits closest to "this is what to do" instructions for stronger steering.
  let userMessage = `${userContext}\n\nMevcut öğün: ${mealLabel} (öneriler AYNI öğün tipinde olmalı — kahvaltı için kahvaltılık, ana yemek için ana yemek)\nİçerik: ${currentContent}${macroInfo ? `\nMakrolar: ${macroInfo}` : ""}${planTypeContext}${budgetContext}${weekContext}${prevContext}\n\nBu öğüne benzer makrolarla, "${mealLabel}" öğün tipine uygun, birbirinden FARKLI 3 alternatif öneri yap. Her öneri farklı protein kaynağı ve farklı mutfak tarzı kullanmalı (kullanıcı isteği bunu override edebilir). Eğer kalan makro bütçesi verilmişse, önerilerini bu bütçeye uyumlu yap. JSON formatında yanıt ver: { "suggestions": [{ "content": "...", "calories": number, "proteinG": "number", "carbsG": "number", "fatG": "number" }, ...] }`;
  if (userNote?.trim()) {
    userMessage += buildUserNotePriorityBlock(userNote);
  }

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

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
      messages: [{ role: "user", content: userMessage }],
    });

    inputTokens = message.usage.input_tokens;
    outputTokens = message.usage.output_tokens;

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    let result: { suggestions: MealVariationSuggestion[] };
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
      result = { suggestions };
    } catch {
      // Fallback: treat entire response as single suggestion
      result = {
        suggestions: [{
          content: text,
          calories: calories ?? null,
          proteinG: proteinG ?? null,
          carbsG: carbsG ?? null,
          fatG: fatG ?? null,
        }],
      };
    }

    await logAiUsage(user.id, "meal", {
      status: "success",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });

    return result;
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(user.id, "meal", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });
    console.error("[AI] Error generating meal variation:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}

function normalizeNotes(notes: string | null): string {
  return (notes ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

async function callAIForTips(
  exerciseName: string,
  englishName: string | null,
  exerciseNotes: string | null,
  userContext: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = getAIClient();
  const nameLine = englishName?.trim()
    ? `Egzersiz: ${exerciseName} (${englishName.trim()})`
    : `Egzersiz: ${exerciseName}`;
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
        content: `${userContext}\n\n${nameLine}${exerciseNotes ? `\nEgzersiz notları: ${exerciseNotes}` : ""}\n\nBu egzersiz için doğru form ipuçları, nefes tekniği, hedef kas odağı ve yaygın hataları açıkla.`,
      },
    ],
  });
  return {
    text: message.content[0].type === "text" ? message.content[0].text : "",
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
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
  englishName: string | null = null,
) {
  const user = await getAuthUser();
  const nameNorm = exerciseName.toLowerCase().trim();
  const notesNorm = normalizeNotes(exerciseNotes);
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

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const userContext = await buildUserContext(user.id);
    const result = await callAIForTips(exerciseName, englishName, exerciseNotes, userContext);
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;

    await upsertTips(user.id, nameNorm, notesNorm, result.text);

    await logAiUsage(user.id, "exercise", {
      status: "success",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });

    return { tips: result.text };
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(user.id, "exercise", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });
    console.error("[AI] Error generating exercise tips:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}

export async function regenerateExerciseFormTips(
  exerciseName: string,
  exerciseNotes: string | null,
  englishName: string | null = null,
) {
  const user = await getAuthUser();
  await checkRateLimit(user.id, "exercise");

  const nameNorm = exerciseName.toLowerCase().trim();
  const notesNorm = normalizeNotes(exerciseNotes);

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const userContext = await buildUserContext(user.id);
    const result = await callAIForTips(exerciseName, englishName, exerciseNotes, userContext);
    inputTokens = result.inputTokens;
    outputTokens = result.outputTokens;

    await upsertTips(user.id, nameNorm, notesNorm, result.text);

    await logAiUsage(user.id, "exercise", {
      status: "success",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });

    return { tips: result.text };
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(user.id, "exercise", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });
    console.error("[AI] Error regenerating exercise tips:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}
