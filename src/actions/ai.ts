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
import { buildUserContext } from "@/lib/ai-context";
import {
  getMealVariationPrompt,
  getExerciseTipsPrompt,
} from "@/lib/ai-prompts";
import { getUserLocale, type Locale } from "@/lib/locale";
import { parseAiJson } from "@/lib/ai-json-repair";
import { categorizeWarnings } from "@/lib/ai-warning-telemetry";
import {
  parseMacroNum,
  validateAgainstOriginal,
  type OriginalMacros,
} from "@/lib/meal-variation-validate";

const TIPS_TTL_DAYS = 30;

interface MealVariationCallResult {
  suggestions: MealVariationSuggestion[];
  inputTokens: number;
  outputTokens: number;
}

/** One AI call → parsed suggestions. Shared by the initial call and the retry. */
async function callMealVariation(
  userMessage: string,
  locale: Locale,
  fallback: OriginalMacros,
): Promise<MealVariationCallResult> {
  const client = getAIClient();
  const message = await client.messages.create({
    model: AI_MODELS.fast,
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: getMealVariationPrompt(locale),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  let suggestions: MealVariationSuggestion[];
  try {
    const parsed = parseAiJson(text) as Record<string, unknown>;
    const suggestionsRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [parsed];
    suggestions = suggestionsRaw.map((s: Record<string, unknown>) => {
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
  } catch {
    // Fallback: treat entire response as a single suggestion with original macros
    suggestions = [{
      content: text,
      calories: fallback.calories,
      proteinG: fallback.protein != null ? String(fallback.protein) : null,
      carbsG: fallback.carbs != null ? String(fallback.carbs) : null,
      fatG: fallback.fat != null ? String(fallback.fat) : null,
    }];
  }

  return {
    suggestions,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

export interface MealVariationSuggestion {
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
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
): Promise<{ suggestions: MealVariationSuggestion[]; validationWarnings: string[] }> {
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
  const locale = getUserLocale(user);

  const userContext = await buildUserContext(user.id, { locale, slim: true });

  const macroInfo = [
    calories ? `${calories} kcal` : null,
    proteinG ? `Protein: ${proteinG}g` : null,
    carbsG ? `${locale === "en" ? "Carbs" : "Karb"}: ${carbsG}g` : null,
    fatG ? `${locale === "en" ? "Fat" : "Yağ"}: ${fatG}g` : null,
  ]
    .filter(Boolean)
    .join(", ");

  // Original meal macros — the swap target. Suggestions must land within
  // ±tolerance of THESE (not the day's remaining budget).
  const original: OriginalMacros = {
    calories: calories ?? null,
    protein: parseMacroNum(proteinG),
    carbs: parseMacroNum(carbsG),
    fat: parseMacroNum(fatG),
  };

  // Resolve the dailyPlanId from the meal row or the caller — used only for
  // plan-type context + same-type week dedup (no daily-budget fitting; meal
  // variation matches the ORIGINAL meal's macros, not the day's remainder).
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
  if (resolvedDailyPlanId) {
    try {
      const [currentDay] = await db
        .select({ weeklyPlanId: dailyPlans.weeklyPlanId, planType: dailyPlans.planType })
        .from(dailyPlans)
        .where(eq(dailyPlans.id, resolvedDailyPlanId));

      if (currentDay?.planType) {
        const planTypeLabels: Record<string, string> = locale === "en"
          ? {
              workout: "Training day",
              rest: "Rest day",
              swimming: "Swim day",
              nutrition: "Nutrition day",
            }
          : {
              workout: "Antrenman günü",
              rest: "Dinlenme günü",
              swimming: "Yüzme günü",
              nutrition: "Beslenme günü",
            };
        planTypeContext = `\n${locale === "en" ? "Day type" : "Günün tipi"}: ${planTypeLabels[currentDay.planType] ?? currentDay.planType}`;
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
          weekContext = locale === "en"
            ? `\n\nThis week already has these meals of the same type (${mealLabel}); DO NOT repeat them:\n${sameLabelMeals.join("\n")}`
            : `\n\nBu hafta aynı öğün tipinde (${mealLabel}) zaten şunlar var, bunları TEKRARLAMA:\n${sameLabelMeals.join("\n")}`;
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
    prevContext = locale === "en"
      ? `\n\nPrevious suggestions for this meal — DO NOT repeat:\n${recent.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : `\n\nDaha önce bu öğün için şu öneriler yapıldı, bunları TEKRARLAMA:\n${recent.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
  }

  // Build user message — note priority block is appended at the end so it
  // sits closest to "this is what to do" instructions for stronger steering.
  const intro = locale === "en"
    ? `Current meal: ${mealLabel} (suggestions must stay within the SAME meal type — breakfast for breakfast, snack for snack, main for main)\nContent: ${currentContent}${macroInfo ? `\nMacros: ${macroInfo}` : ""}`
    : `Mevcut öğün: ${mealLabel} (öneriler AYNI öğün tipinde olmalı — kahvaltı için kahvaltılık, ara öğün için atıştırmalık, ana yemek için ana yemek)\nİçerik: ${currentContent}${macroInfo ? `\nMakrolar: ${macroInfo}` : ""}`;
  const taskLine = locale === "en"
    ? `Suggest 3 DIFFERENT alternatives of the SAME "${mealLabel}" type. Each suggestion's protein, carbs AND fat MUST each stay within ±15% of the current meal${macroInfo ? ` (${macroInfo})` : ""}. Use a different protein source and cuisine each (user request can override). Reply with JSON: { "suggestions": [{ "content": "...", "calories": number, "proteinG": "number", "carbsG": "number", "fatG": "number" }, ...] }`
    : `"${mealLabel}" öğün tipinde, birbirinden FARKLI 3 alternatif öner. Her önerinin protein, karb VE yağ değeri mevcut öğünün${macroInfo ? ` (${macroInfo})` : ""} ±%15'i içinde olmalı. Her öneri farklı protein kaynağı ve farklı mutfak tarzı kullanmalı (kullanıcı isteği bunu override edebilir). JSON formatında yanıt ver: { "suggestions": [{ "content": "...", "calories": number, "proteinG": "number", "carbsG": "number", "fatG": "number" }, ...] }`;
  const baseUserMessage = `${userContext}\n\n${intro}${planTypeContext}${weekContext}${prevContext}\n\n${taskLine}`;
  const userMessage = userNote?.trim()
    ? baseUserMessage + buildUserNotePriorityBlock(userNote)
    : baseUserMessage;

  const startTime = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const first = await callMealVariation(userMessage, locale, original);
    inputTokens += first.inputTokens;
    outputTokens += first.outputTokens;

    let best = first.suggestions;
    let bestCheck = validateAgainstOriginal(best, original, locale);

    // Single conditional retry: if any suggestion drifts beyond tolerance, nudge
    // the model once to pull macros back toward the original; keep the better set.
    if (bestCheck.offCount > 0) {
      const nudge = locale === "en"
        ? `\n\nThe previous suggestions drifted from the target macros. Target = the CURRENT meal${macroInfo ? `: ${macroInfo}` : ""}. Bring EVERY suggestion's protein, carbs and fat each within ±15% of that, and keep the SAME meal type ("${mealLabel}"). Same JSON format.`
        : `\n\nÖnceki öneriler hedef makrolardan saptı. Hedef = MEVCUT öğün${macroInfo ? `: ${macroInfo}` : ""}. Her önerinin protein, karb ve yağ değerini bu hedefin ±%15'i içine çek ve AYNI öğün tipini ("${mealLabel}") koru. Aynı JSON formatı.`;
      try {
        const second = await callMealVariation(userMessage + nudge, locale, original);
        inputTokens += second.inputTokens;
        outputTokens += second.outputTokens;
        const secondCheck = validateAgainstOriginal(second.suggestions, original, locale);
        // Keep the retry only if it's strictly better: fewer drifting suggestions,
        // or the same count with a smaller total drift.
        const better =
          secondCheck.offCount < bestCheck.offCount ||
          (secondCheck.offCount === bestCheck.offCount && secondCheck.totalDrift < bestCheck.totalDrift);
        if (better) {
          best = second.suggestions;
          bestCheck = secondCheck;
        }
      } catch {
        // Retry failed — keep the first result
      }
    }

    const validationWarnings = bestCheck.warnings;
    const hasWarnings = validationWarnings.length > 0;

    await logAiUsage(user.id, "meal", {
      status: hasWarnings ? "success_with_warnings" : "success",
      errorMessage: hasWarnings
        ? JSON.stringify({
            warnings: validationWarnings,
            warningCategories: categorizeWarnings(validationWarnings),
          })
        : undefined,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });

    return { suggestions: best, validationWarnings };
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
  locale: import("@/lib/locale").Locale,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = getAIClient();
  const exLabel = locale === "en" ? "Exercise" : "Egzersiz";
  const notesLabel = locale === "en" ? "Exercise notes" : "Egzersiz notları";
  const nameLine = englishName?.trim()
    ? `${exLabel}: ${exerciseName} (${englishName.trim()})`
    : `${exLabel}: ${exerciseName}`;
  const task = locale === "en"
    ? "Explain proper form cues, breathing technique, target muscle focus, and common mistakes for this exercise."
    : "Bu egzersiz için doğru form ipuçları, nefes tekniği, hedef kas odağı ve yaygın hataları açıkla.";
  const message = await client.messages.create({
    model: AI_MODELS.fast,
    max_tokens: 1200,
    system: [
      {
        type: "text",
        text: getExerciseTipsPrompt(locale),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `${userContext}\n\n${nameLine}${exerciseNotes ? `\n${notesLabel}: ${exerciseNotes}` : ""}\n\n${task}`,
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
    const locale = getUserLocale(user);
    const userContext = await buildUserContext(user.id, { locale, slim: true });
    const result = await callAIForTips(exerciseName, englishName, exerciseNotes, userContext, locale);
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
    const locale = getUserLocale(user);
    const userContext = await buildUserContext(user.id, { locale, slim: true });
    const result = await callAIForTips(exerciseName, englishName, exerciseNotes, userContext, locale);
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
