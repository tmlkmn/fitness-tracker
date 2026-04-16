"use server";

import { db } from "@/db";
import { exerciseTips } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { getAIClient, AI_MODELS, checkRateLimit } from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
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
  fatG?: string | null
): Promise<{ suggestion: MealVariationSuggestion }> {
  const user = await getAuthUser();
  checkRateLimit(user.id, "meal");

  const userContext = await buildUserContext(user.id);

  const macroInfo = [
    calories ? `${calories} kcal` : null,
    proteinG ? `Protein: ${proteinG}g` : null,
    carbsG ? `Karb: ${carbsG}g` : null,
    fatG ? `Yağ: ${fatG}g` : null,
  ]
    .filter(Boolean)
    .join(", ");

  try {
    const client = getAIClient();
    const message = await client.messages.create({
      model: AI_MODELS.fast,
      max_tokens: 400,
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
          content: `${userContext}\n\nMevcut öğün: ${mealLabel}\nİçerik: ${currentContent}${macroInfo ? `\nMakrolar: ${macroInfo}` : ""}\n\nBu öğüne benzer makrolarla alternatif bir öğün öner. JSON formatında yanıt ver.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const parsed = parseJSON(text) as Record<string, unknown>;
      return {
        suggestion: {
          content: String(parsed.content ?? ""),
          calories: parsed.calories != null ? Number(parsed.calories) : null,
          proteinG: parsed.proteinG != null ? String(parsed.proteinG) : null,
          carbsG: parsed.carbsG != null ? String(parsed.carbsG) : null,
          fatG: parsed.fatG != null ? String(parsed.fatG) : null,
        },
      };
    } catch {
      // Fallback: treat entire response as content text
      return {
        suggestion: {
          content: text,
          calories: calories ?? null,
          proteinG: proteinG ?? null,
          carbsG: carbsG ?? null,
          fatG: fatG ?? null,
        },
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
  checkRateLimit(user.id, "exercise");

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
  checkRateLimit(user.id, "exercise");

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
