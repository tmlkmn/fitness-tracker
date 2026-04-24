"use server";

import { db } from "@/db";
import { exercises, exerciseAlternatives } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { getAIClient, AI_MODELS, checkRateLimit, logAiUsage } from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { buildWeeklyWorkoutContext } from "@/lib/ai-workout-context";
import {
  buildSectionContext,
  buildExerciseAlternativesContext,
} from "@/lib/ai-workout-slim-context";
import {
  verifyDailyPlanOwnership,
  verifyExerciseOwnership,
} from "@/lib/ownership";
import {
  WORKOUT_REPLACE_PROMPT,
  SECTION_REPLACE_PROMPT,
  EXERCISE_VARIATION_PROMPT,
} from "@/lib/ai-prompts";

// Types for AI-generated exercise data
export interface AIExercise {
  name: string;
  englishName: string | null;
  section: string;
  sectionLabel: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

export interface AIExerciseVariation {
  name: string;
  englishName: string | null;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

function parseJSON(text: string): unknown {
  // Strip markdown code fences if present
  let cleaned = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  return JSON.parse(cleaned);
}

function validateExerciseArray(data: unknown): AIExercise[] {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.exercises)) {
    throw new Error("Invalid response format: expected { exercises: [...] }");
  }
  return (obj.exercises as Record<string, unknown>[]).map((ex) => ({
    name: String(ex.name ?? ""),
    englishName: ex.englishName != null && String(ex.englishName).trim() !== "" ? String(ex.englishName) : null,
    section: String(ex.section ?? "main"),
    sectionLabel: String(ex.sectionLabel ?? "Ana Antrenman"),
    sets: ex.sets != null ? Number(ex.sets) : null,
    reps: ex.reps != null ? String(ex.reps) : null,
    restSeconds: ex.restSeconds != null ? Number(ex.restSeconds) : null,
    durationMinutes: ex.durationMinutes != null ? Number(ex.durationMinutes) : null,
    notes: ex.notes != null ? String(ex.notes) : null,
  }));
}

function validateAlternativesArray(data: unknown): AIExerciseVariation[] {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.alternatives)) {
    throw new Error("Invalid response format: expected { alternatives: [...] }");
  }
  return (obj.alternatives as Record<string, unknown>[]).map((ex) => ({
    name: String(ex.name ?? ""),
    englishName: ex.englishName != null && String(ex.englishName).trim() !== "" ? String(ex.englishName) : null,
    sets: ex.sets != null ? Number(ex.sets) : null,
    reps: ex.reps != null ? String(ex.reps) : null,
    restSeconds: ex.restSeconds != null ? Number(ex.restSeconds) : null,
    durationMinutes: ex.durationMinutes != null ? Number(ex.durationMinutes) : null,
    notes: ex.notes != null ? String(ex.notes) : null,
  }));
}

async function callAI(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 2500,
  useSmartModel: boolean = false,
) {
  const client = getAIClient();

  const message = await client.messages.create({
    model: useSmartModel ? AI_MODELS.smart : AI_MODELS.fast,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userMessage }],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

// ─── Feature 1: Full Workout Replacement ────────────────────────────────────

export async function generateWorkoutReplacement(dailyPlanId: number, userNote?: string) {
  const user = await getAuthUser();
  await checkRateLimit(user.id, "workout");
  await logAiUsage(user.id, "workout");
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  const [userContext, { context: workoutContext, currentDayExercises, planType }] =
    await Promise.all([
      buildUserContext(user.id),
      buildWeeklyWorkoutContext(dailyPlanId),
    ]);

  const mode = currentDayExercises.length > 0 ? "Replacement" : "Generation";
  let userMessage = `${userContext}\n\n${workoutContext}\n\nBugünün planType: "${planType ?? "workout"}" — sadece bu planType için izin verilen section'ları kullan.\nMod: ${mode}\n\nBu günün antrenman programını ${mode === "Replacement" ? "yeniden oluştur ve" : "sıfırdan oluştur;"} önceki haftalara göre progresif yüklenme uygula: daha fazla hacim, daha zorlu hareketler, veya yeni varyasyonlar ekle. Aynı kas grubunu hedefle ama gelişim sağla.`;

  if (userNote?.trim()) {
    userMessage += `\n\n═══ KULLANICI İSTEĞİ ═══\nKullanıcı bu antrenman için şunları belirtti: ${userNote.trim()}\nBu isteği mutlaka dikkate al.`;
  }

  try {
    let text = await callAI(WORKOUT_REPLACE_PROMPT, userMessage, 2500, true);

    let suggestedExercises: AIExercise[];
    try {
      suggestedExercises = validateExerciseArray(parseJSON(text));
    } catch {
      // Retry once with error feedback
      text = await callAI(
        WORKOUT_REPLACE_PROMPT,
        `${userMessage}\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "exercises": [...] }`,
        2500,
        true,
      );
      suggestedExercises = validateExerciseArray(parseJSON(text));
    }

    return { currentExercises: currentDayExercises, suggestedExercises };
  } catch (error) {
    console.error("[AI Workout] Error generating workout replacement:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}

export async function applyWorkoutReplacement(
  dailyPlanId: number,
  newExercises: AIExercise[],
) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  // Delete all existing exercises for this day
  await db.delete(exercises).where(eq(exercises.dailyPlanId, dailyPlanId));

  // Insert new exercises
  if (newExercises.length > 0) {
    await db.insert(exercises).values(
      newExercises.map((ex, i) => ({
        dailyPlanId,
        section: ex.section,
        sectionLabel: ex.sectionLabel,
        name: ex.name,
        englishName: ex.englishName,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds,
        durationMinutes: ex.durationMinutes,
        notes: ex.notes,
        isCompleted: false,
        sortOrder: i,
      })),
    );
  }

  revalidatePath("/");
}

// ─── Feature 2: Section Replacement ─────────────────────────────────────────

export async function generateSectionReplacement(
  dailyPlanId: number,
  section: string,
  sectionLabel: string,
  userNote?: string,
) {
  const user = await getAuthUser();
  await checkRateLimit(user.id, "workout");
  await logAiUsage(user.id, "workout");
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  // Slim context — just today's other sections + same section from 1 prev week.
  // Full weekly context would waste ~60-70% of tokens for a section-level call.
  const [userContext, slim] = await Promise.all([
    buildUserContext(user.id),
    buildSectionContext(dailyPlanId, section),
  ]);
  const sectionExercises = slim.sectionExercises;

  let userMessage = `${userContext}\n\n${slim.context}\n\nBugünün planType: "${slim.planType ?? "workout"}" — sadece bu planType için izin verilen section'ları kullan.\n\nSadece "${sectionLabel}" bölümü için yeni egzersizler oluştur. TÜM egzersizler section="${section}", sectionLabel="${sectionLabel}" olmalı — başka section DÖNDÜRME. Önceki haftalara göre progresif yüklenme uygula.`;

  if (userNote?.trim()) {
    userMessage += `\n\n═══ KULLANICI İSTEĞİ ═══\nKullanıcı bu bölüm için şunları belirtti: ${userNote.trim()}\nBu isteği mutlaka dikkate al.`;
  }

  try {
    let text = await callAI(SECTION_REPLACE_PROMPT, userMessage, 1500, true);

    let suggestedExercises: AIExercise[];
    try {
      suggestedExercises = validateExerciseArray(parseJSON(text));
    } catch {
      text = await callAI(
        SECTION_REPLACE_PROMPT,
        `${userMessage}\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "exercises": [...] }`,
        1500,
        true,
      );
      suggestedExercises = validateExerciseArray(parseJSON(text));
    }

    // Guard: drop any exercise whose section doesn't match the requested one.
    // Prompt instructs the AI to stay within section, but we must enforce it
    // because applySectionReplacement only deletes the requested section.
    const filtered = suggestedExercises.filter((ex) => ex.section === section);
    if (filtered.length !== suggestedExercises.length) {
      console.warn(
        `[AI Workout] Dropped ${suggestedExercises.length - filtered.length} out-of-section exercises (expected section="${section}")`,
      );
    }
    suggestedExercises = filtered.map((ex) => ({
      ...ex,
      sectionLabel,
    }));

    return { currentExercises: sectionExercises, suggestedExercises };
  } catch (error) {
    console.error("[AI Workout] Error generating section replacement:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}

export async function applySectionReplacement(
  dailyPlanId: number,
  section: string,
  newExercises: AIExercise[],
) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  // Defensive filter: only insert exercises matching the requested section.
  // Mirrors the guard in generateSectionReplacement; protects direct callers.
  newExercises = newExercises.filter((ex) => ex.section === section);

  // Delete existing exercises for this section
  await db
    .delete(exercises)
    .where(
      and(eq(exercises.dailyPlanId, dailyPlanId), eq(exercises.section, section)),
    );

  // Determine sort order offset based on section position
  const sectionOrder = ["warmup", "main", "cooldown", "sauna", "swimming"];
  const sectionIndex = sectionOrder.indexOf(section);
  const sortOffset = (sectionIndex >= 0 ? sectionIndex : 5) * 100;

  // Insert new exercises
  if (newExercises.length > 0) {
    await db.insert(exercises).values(
      newExercises.map((ex, i) => ({
        dailyPlanId,
        section: ex.section,
        sectionLabel: ex.sectionLabel,
        name: ex.name,
        englishName: ex.englishName,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds,
        durationMinutes: ex.durationMinutes,
        notes: ex.notes,
        isCompleted: false,
        sortOrder: sortOffset + i,
      })),
    );
  }

  revalidatePath("/");
}

// ─── Feature 3: Single Exercise Variation (3 alternatives, cached) ───────────

const ALTERNATIVES_TTL_DAYS = 30;

export async function generateExerciseVariation(
  exerciseId: number,
  dailyPlanId: number,
  userNote?: string,
  forceRefresh?: boolean,
) {
  const user = await getAuthUser();
  await verifyExerciseOwnership(exerciseId, user.id);

  // Get the current exercise
  const [currentExercise] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, exerciseId));

  if (!currentExercise) {
    throw new Error("Exercise not found");
  }

  const nameNorm = currentExercise.name.toLowerCase().trim();
  const hasUserNote = Boolean(userNote?.trim());

  // Cache lookup — skip when user provided a note (note-driven alternatives
  // are request-specific and must not be cached). Also skip on forceRefresh.
  if (!forceRefresh && !hasUserNote) {
    const ttlCutoff = new Date(
      Date.now() - ALTERNATIVES_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    const [cached] = await db
      .select({ suggestions: exerciseAlternatives.suggestions })
      .from(exerciseAlternatives)
      .where(
        and(
          eq(exerciseAlternatives.userId, user.id),
          eq(exerciseAlternatives.exerciseNameNorm, nameNorm),
          gte(exerciseAlternatives.createdAt, ttlCutoff),
        ),
      );

    if (cached) {
      return {
        currentExercise,
        alternatives: cached.suggestions as AIExerciseVariation[],
        fromCache: true,
      };
    }
  }

  // No cache or force refresh — call AI
  await checkRateLimit(user.id, "workout");
  await logAiUsage(user.id, "workout");

  // Slim context — just muscle group + today's siblings + staleness.
  // Full weekly context was ~3000 tokens for a single-exercise call.
  const [userContext, slimContext] = await Promise.all([
    buildUserContext(user.id),
    buildExerciseAlternativesContext(exerciseId, dailyPlanId),
  ]);

  const exerciseDetail = [
    currentExercise.name,
    currentExercise.sets && currentExercise.reps
      ? `${currentExercise.sets}x${currentExercise.reps}`
      : null,
    currentExercise.durationMinutes
      ? `${currentExercise.durationMinutes}dk`
      : null,
    currentExercise.restSeconds
      ? `${currentExercise.restSeconds}sn dinlenme`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  const userMessage = `${userContext}\n\n${slimContext}\n\n"${exerciseDetail}" egzersizi yerine 3 farklı alternatif egzersiz öner.${userNote?.trim() ? `\n\n═══ KULLANICI İSTEĞİ ═══\nKullanıcı bu egzersiz için şunları belirtti: ${userNote.trim()}\nBu isteği mutlaka dikkate al.` : ""}`;

  try {
    // H1: use smart model — alternative selection needs anatomical reasoning
    // and progressive overload sense that Haiku gets wrong often.
    let text = await callAI(EXERCISE_VARIATION_PROMPT, userMessage, 800, true);

    let alternatives: AIExerciseVariation[];
    try {
      alternatives = validateAlternativesArray(parseJSON(text));
    } catch {
      text = await callAI(
        EXERCISE_VARIATION_PROMPT,
        `${userMessage}\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "alternatives": [...] }`,
        800,
        true,
      );
      alternatives = validateAlternativesArray(parseJSON(text));
    }

    // Upsert to DB cache — only when there's no user note (note-driven
    // alternatives are one-off and shouldn't leak into future noteless calls)
    if (!hasUserNote) {
      await db
        .insert(exerciseAlternatives)
        .values({
          userId: user.id,
          exerciseNameNorm: nameNorm,
          suggestions: alternatives,
        })
        .onConflictDoUpdate({
          target: [exerciseAlternatives.userId, exerciseAlternatives.exerciseNameNorm],
          set: { suggestions: alternatives, createdAt: new Date() },
        });
    }

    return { currentExercise, alternatives, fromCache: false };
  } catch (error) {
    console.error("[AI Workout] Error generating exercise variation:", error);
    throw new Error("AI_UNAVAILABLE");
  }
}

export async function applyExerciseVariation(
  exerciseId: number,
  newExercise: AIExerciseVariation,
) {
  const user = await getAuthUser();
  await verifyExerciseOwnership(exerciseId, user.id);

  await db
    .update(exercises)
    .set({
      name: newExercise.name,
      englishName: newExercise.englishName,
      sets: newExercise.sets,
      reps: newExercise.reps,
      restSeconds: newExercise.restSeconds,
      durationMinutes: newExercise.durationMinutes,
      notes: newExercise.notes,
      isCompleted: false,
    })
    .where(eq(exercises.id, exerciseId));

  revalidatePath("/");
}
