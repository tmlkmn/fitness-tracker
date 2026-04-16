"use server";

import { db } from "@/db";
import { exercises } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { getAIClient, AI_MODELS, checkRateLimit } from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { buildWeeklyWorkoutContext } from "@/lib/ai-workout-context";
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
  section: string;
  sectionLabel: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

interface AIExerciseVariation {
  name: string;
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
    section: String(ex.section ?? "main"),
    sectionLabel: String(ex.sectionLabel ?? "Ana Antrenman"),
    sets: ex.sets != null ? Number(ex.sets) : null,
    reps: ex.reps != null ? String(ex.reps) : null,
    restSeconds: ex.restSeconds != null ? Number(ex.restSeconds) : null,
    durationMinutes: ex.durationMinutes != null ? Number(ex.durationMinutes) : null,
    notes: ex.notes != null ? String(ex.notes) : null,
  }));
}

function validateSingleExercise(data: unknown): AIExerciseVariation {
  const ex = data as Record<string, unknown>;
  if (!ex || typeof ex !== "object" || !ex.name) {
    throw new Error("Invalid response format: expected exercise object with name");
  }
  return {
    name: String(ex.name),
    sets: ex.sets != null ? Number(ex.sets) : null,
    reps: ex.reps != null ? String(ex.reps) : null,
    restSeconds: ex.restSeconds != null ? Number(ex.restSeconds) : null,
    durationMinutes: ex.durationMinutes != null ? Number(ex.durationMinutes) : null,
    notes: ex.notes != null ? String(ex.notes) : null,
  };
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
  checkRateLimit(user.id, "workout");
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  const [userContext, { context: workoutContext, currentDayExercises }] =
    await Promise.all([
      buildUserContext(user.id),
      buildWeeklyWorkoutContext(dailyPlanId),
    ]);

  let userMessage = `${userContext}\n\n${workoutContext}\n\nBu günün antrenman programını yeniden oluştur. Önceki haftalara göre progresif yüklenme uygula: daha fazla hacim, daha zorlu hareketler, veya yeni varyasyonlar ekle. Aynı kas grubunu hedefle ama gelişim sağla.`;

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
  checkRateLimit(user.id, "workout");
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  const [userContext, { context: workoutContext, currentDayExercises }] =
    await Promise.all([
      buildUserContext(user.id),
      buildWeeklyWorkoutContext(dailyPlanId),
    ]);

  const sectionExercises = currentDayExercises.filter(
    (e) => e.section === section,
  );

  let userMessage = `${userContext}\n\n${workoutContext}\n\nSadece "${sectionLabel}" bölümü için yeni egzersizler oluştur. section="${section}", sectionLabel="${sectionLabel}" değerlerini koru. Önceki haftalara göre progresif yüklenme uygula.`;

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

// ─── Feature 3: Single Exercise Variation ───────────────────────────────────

export async function generateExerciseVariation(
  exerciseId: number,
  dailyPlanId: number,
  userNote?: string,
) {
  const user = await getAuthUser();
  checkRateLimit(user.id, "workout");
  await verifyExerciseOwnership(exerciseId, user.id);

  const [userContext, { context: workoutContext }] = await Promise.all([
    buildUserContext(user.id),
    buildWeeklyWorkoutContext(dailyPlanId),
  ]);

  // Get the current exercise
  const [currentExercise] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, exerciseId));

  if (!currentExercise) {
    throw new Error("Exercise not found");
  }

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

  const userMessage = `${userContext}\n\n${workoutContext}\n\n"${exerciseDetail}" egzersizi yerine alternatif bir egzersiz öner.${userNote?.trim() ? `\n\n═══ KULLANICI İSTEĞİ ═══\nKullanıcı bu egzersiz için şunları belirtti: ${userNote.trim()}\nBu isteği mutlaka dikkate al.` : ""}`;

  try {
    let text = await callAI(EXERCISE_VARIATION_PROMPT, userMessage, 500);

    let suggestedExercise: AIExerciseVariation;
    try {
      suggestedExercise = validateSingleExercise(parseJSON(text));
    } catch {
      text = await callAI(
        EXERCISE_VARIATION_PROMPT,
        `${userMessage}\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "name": "...", ... }`,
        500,
      );
      suggestedExercise = validateSingleExercise(parseJSON(text));
    }

    return { currentExercise, suggestedExercise };
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
