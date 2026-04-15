"use server";

import { getAuthUser } from "@/lib/auth-utils";
import { getAIClient, AI_MODELS, checkRateLimit } from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import {
  MEAL_VARIATION_PROMPT,
  EXERCISE_TIPS_PROMPT,
} from "@/lib/ai-prompts";

// Server-side cache for exercise form tips (exercise name → tips text)
const exerciseTipsCache = new Map<string, string>();

export async function generateMealVariation(
  mealLabel: string,
  currentContent: string,
  calories?: number | null,
  proteinG?: string | null,
  carbsG?: string | null,
  fatG?: string | null
) {
  const user = await getAuthUser();
  checkRateLimit(user.id, "meal");

  const userContext = await buildUserContext(user.id);
  const client = getAIClient();

  const macroInfo = [
    calories ? `${calories} kcal` : null,
    proteinG ? `Protein: ${proteinG}g` : null,
    carbsG ? `Karb: ${carbsG}g` : null,
    fatG ? `Yağ: ${fatG}g` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const message = await client.messages.create({
    model: AI_MODELS.fast,
    max_tokens: 300,
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
        content: `${userContext}\n\nMevcut öğün: ${mealLabel}\nİçerik: ${currentContent}${macroInfo ? `\nMakrolar: ${macroInfo}` : ""}\n\nBu öğüne benzer makrolarla alternatif bir öğün öner.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  return { suggestion: text };
}

export async function getExerciseFormTips(
  exerciseName: string,
  exerciseNotes: string | null
) {
  // Check server-side cache first
  const cacheKey = exerciseName.toLowerCase().trim();
  const cached = exerciseTipsCache.get(cacheKey);
  if (cached) {
    return { tips: cached };
  }

  const user = await getAuthUser();
  checkRateLimit(user.id, "exercise");

  const userContext = await buildUserContext(user.id);
  const client = getAIClient();

  const message = await client.messages.create({
    model: AI_MODELS.fast,
    max_tokens: 400,
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
        content: `${userContext}\n\nEgzersiz: ${exerciseName}${exerciseNotes ? `\nNotlar: ${exerciseNotes}` : ""}\n\nBu egzersiz için form ipuçları ver.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Cache the result
  exerciseTipsCache.set(cacheKey, text);

  return { tips: text };
}
