"use server";

import { db } from "@/db";
import { exercises, exerciseAlternatives } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  AI_MODELS,
  checkRateLimit,
  logAiUsage,
  buildUserNotePriorityBlock,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import { callAIText, executeAIWithRetries } from "@/lib/ai-runtime";
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
  getWorkoutReplacePrompt,
  getSectionReplacePrompt,
  getExerciseVariationPrompt,
} from "@/lib/ai-prompts";
import { getUserLocale } from "@/lib/locale";
import {
  validateDailyExerciseArray,
  dailyExercisesNeedRetry,
  buildDailyExercisesRetryNudge,
  scoreExerciseValidationGaps,
  type ValidateDailyExercisesOptions,
} from "@/lib/ai-daily-validators";
import {
  sanitizeRestSeconds,
  sanitizeDurationMinutes,
} from "@/lib/ai-shape-validators";
import { parseAiJson } from "@/lib/ai-json-repair";

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

/**
 * Alternatives have a different envelope (no section field). Inline
 * sanitization for restSeconds/durationMinutes keeps DB CHECK happy.
 */
function validateAlternativesArray(data: unknown): AIExerciseVariation[] {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.alternatives)) {
    throw new Error("Invalid response format: expected { alternatives: [...] }");
  }
  const warnings: string[] = [];
  const result: AIExerciseVariation[] = (obj.alternatives as Record<string, unknown>[]).map((ex, i) => ({
    name: String(ex.name ?? ""),
    englishName: ex.englishName != null && String(ex.englishName).trim() !== "" ? String(ex.englishName) : null,
    sets: ex.sets != null ? Number(ex.sets) : null,
    reps: ex.reps != null ? String(ex.reps) : null,
    restSeconds: sanitizeRestSeconds(ex.restSeconds, `alternatives[${i}]`, warnings),
    durationMinutes: sanitizeDurationMinutes(ex.durationMinutes, `alternatives[${i}]`, warnings),
    notes: ex.notes != null ? String(ex.notes) : null,
  }));
  if (warnings.length > 0) {
    console.warn(`[validateAlternativesArray] ${warnings.length} warning(s):`, warnings);
  }
  return result;
}


// ─── Feature 1: Full Workout Replacement ────────────────────────────────────

export async function generateWorkoutReplacement(dailyPlanId: number, userNote?: string) {
  const user = await getAuthUser();
  await checkRateLimit(user.id, "workout");
  await verifyDailyPlanOwnership(dailyPlanId, user.id);
  const locale = getUserLocale(user);

  const [userContext, { context: workoutContext, exercises: currentDayExercises, planType }] =
    await Promise.all([
      buildUserContext(user.id, { locale }),
      buildWeeklyWorkoutContext(dailyPlanId),
    ]);

  const mode = currentDayExercises.length > 0 ? "Replacement" : "Generation";
  let userMessage = locale === "en"
    ? `${userContext}\n\n${workoutContext}\n\nToday's planType: "${planType ?? "workout"}" — use only sections allowed for this planType.\nMode: ${mode}\n\n${mode === "Replacement" ? "Rebuild today's workout and apply" : "Build today's workout from scratch; apply"} progressive overload vs previous weeks: more volume, harder movements, or new variations. Target the same muscle groups but ensure progression.`
    : `${userContext}\n\n${workoutContext}\n\nBugünün planType: "${planType ?? "workout"}" — sadece bu planType için izin verilen section'ları kullan.\nMod: ${mode}\n\nBu günün antrenman programını ${mode === "Replacement" ? "yeniden oluştur ve" : "sıfırdan oluştur;"} önceki haftalara göre progresif yüklenme uygula: daha fazla hacim, daha zorlu hareketler, veya yeni varyasyonlar ekle. Aynı kas grubunu hedefle ama gelişim sağla.`;

  if (userNote?.trim()) {
    userMessage += buildUserNotePriorityBlock(userNote);
  }

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  // Required sections per planType: full workout day must have warmup +
  // main + cooldown; swimming day needs warmup + swimming + cooldown.
  // Rest days call this function rarely but if they do, no requirements.
  const requiredSections =
    planType === "swimming"
      ? ["warmup", "swimming", "cooldown"]
      : planType === "rest"
        ? []
        : ["warmup", "main", "cooldown"];
  const minExerciseCount = planType === "rest" ? 0 : 5;

  try {
    const callOpts = {
      systemPrompt: getWorkoutReplacePrompt(locale),
      maxTokens: 5000,
      model: "smart" as const,
    };
    const parseFailureAddendum = locale === "en"
      ? `\n\nPREVIOUS RESPONSE RETURNED INVALID JSON. Reply with valid JSON only: { "exercises": [...] }`
      : `\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "exercises": [...] }`;
    const validatorOpts = { requiredSections, minExerciseCount };

    const exec = await executeAIWithRetries({
      userMessage,
      initial: () => callAIText({ ...callOpts, userMessage }),
      retry: (msg) => callAIText({ ...callOpts, userMessage: msg }),
      consume: (raw) => validateDailyExerciseArray(parseAiJson(raw.text), validatorOpts),
      onParseFailure: async () => {
        const raw = await callAIText({ ...callOpts, userMessage: `${userMessage}${parseFailureAddendum}` });
        return { raw, result: validateDailyExerciseArray(parseAiJson(raw.text), validatorOpts) };
      },
      retries: [
        {
          buildRetryMessage: (current) =>
            dailyExercisesNeedRetry(current)
              ? buildDailyExercisesRetryNudge(current, minExerciseCount)
              : null,
          shouldKeep: (prev, candidate) =>
            scoreExerciseValidationGaps(candidate) < scoreExerciseValidationGaps(prev),
        },
      ],
    });

    const validation = exec.result;
    inputTokens = exec.inputTokens;
    outputTokens = exec.outputTokens;

    const suggestedExercises: AIExercise[] = validation.exercises as AIExercise[];
    const hasWarnings = validation.warnings.length > 0;

    await logAiUsage(user.id, "workout", {
      status: hasWarnings ? "success_with_warnings" : "success",
      errorMessage: hasWarnings
        ? JSON.stringify({ warnings: validation.warnings }).slice(0, 500)
        : undefined,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    return { currentExercises: currentDayExercises, suggestedExercises };
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(user.id, "workout", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });
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
  await verifyDailyPlanOwnership(dailyPlanId, user.id);
  const locale = getUserLocale(user);

  // Slim context — just today's other sections + same section from 1 prev week.
  // Full weekly context would waste ~60-70% of tokens for a section-level call.
  const [userContext, slim] = await Promise.all([
    buildUserContext(user.id, { locale }),
    buildSectionContext(dailyPlanId, section),
  ]);
  const sectionExercises = slim.exercises;

  let userMessage = locale === "en"
    ? `${userContext}\n\n${slim.context}\n\nToday's planType: "${slim.planType ?? "workout"}" — use only sections allowed for this planType.\n\nBuild new exercises for the "${sectionLabel}" section only. ALL exercises must have section="${section}", sectionLabel="${sectionLabel}" — DO NOT return another section. Apply progressive overload vs previous weeks.`
    : `${userContext}\n\n${slim.context}\n\nBugünün planType: "${slim.planType ?? "workout"}" — sadece bu planType için izin verilen section'ları kullan.\n\nSadece "${sectionLabel}" bölümü için yeni egzersizler oluştur. TÜM egzersizler section="${section}", sectionLabel="${sectionLabel}" olmalı — başka section DÖNDÜRME. Önceki haftalara göre progresif yüklenme uygula.`;

  if (userNote?.trim()) {
    userMessage += buildUserNotePriorityBlock(userNote);
  }

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  // forcedSection drops any exercise whose section ≠ requested AND rewrites
  // sectionLabel for the survivors. Replaces the previous manual filter+map.
  const validatorOptions: ValidateDailyExercisesOptions = {
    forcedSection: section,
    forcedSectionLabel: sectionLabel,
    minExerciseCount: 2,
  };

  try {
    const callOpts = {
      systemPrompt: getSectionReplacePrompt(locale),
      maxTokens: 3000,
      model: "smart" as const,
    };
    const parseFailureAddendum = locale === "en"
      ? `\n\nPREVIOUS RESPONSE RETURNED INVALID JSON. Reply with valid JSON only: { "exercises": [...] }`
      : `\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "exercises": [...] }`;

    const exec = await executeAIWithRetries({
      userMessage,
      initial: () => callAIText({ ...callOpts, userMessage }),
      retry: (msg) => callAIText({ ...callOpts, userMessage: msg }),
      consume: (raw) => validateDailyExerciseArray(parseAiJson(raw.text), validatorOptions),
      onParseFailure: async () => {
        const raw = await callAIText({ ...callOpts, userMessage: `${userMessage}${parseFailureAddendum}` });
        return { raw, result: validateDailyExerciseArray(parseAiJson(raw.text), validatorOptions) };
      },
      retries: [
        {
          buildRetryMessage: (current) =>
            dailyExercisesNeedRetry(current)
              ? buildDailyExercisesRetryNudge(current, validatorOptions.minExerciseCount)
              : null,
          shouldKeep: (prev, candidate) =>
            scoreExerciseValidationGaps(candidate) < scoreExerciseValidationGaps(prev),
        },
      ],
    });

    const validation = exec.result;
    inputTokens = exec.inputTokens;
    outputTokens = exec.outputTokens;

    const suggestedExercises: AIExercise[] = validation.exercises as AIExercise[];
    const hasWarnings = validation.warnings.length > 0;

    await logAiUsage(user.id, "workout", {
      status: hasWarnings ? "success_with_warnings" : "success",
      errorMessage: hasWarnings
        ? JSON.stringify({ warnings: validation.warnings }).slice(0, 500)
        : undefined,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    return { currentExercises: sectionExercises, suggestedExercises };
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(user.id, "workout", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });
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
  const locale = getUserLocale(user);

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

  // Slim context — just muscle group + today's siblings + staleness.
  // Full weekly context was ~3000 tokens for a single-exercise call.
  const [userContext, slimContext] = await Promise.all([
    buildUserContext(user.id, { locale }),
    buildExerciseAlternativesContext(exerciseId, dailyPlanId),
  ]);

  const exerciseDetail = [
    currentExercise.name,
    currentExercise.sets && currentExercise.reps
      ? `${currentExercise.sets}x${currentExercise.reps}`
      : null,
    currentExercise.durationMinutes
      ? `${currentExercise.durationMinutes}${locale === "en" ? "min" : "dk"}`
      : null,
    currentExercise.restSeconds
      ? `${currentExercise.restSeconds}${locale === "en" ? "s rest" : "sn dinlenme"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  let userMessage = locale === "en"
    ? `${userContext}\n\n${slimContext}\n\nSuggest 3 different alternatives for the "${exerciseDetail}" exercise.`
    : `${userContext}\n\n${slimContext}\n\n"${exerciseDetail}" egzersizi yerine 3 farklı alternatif egzersiz öner.`;
  if (userNote?.trim()) {
    userMessage += buildUserNotePriorityBlock(userNote);
  }

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    // H1: use smart model — alternative selection needs anatomical reasoning
    // and progressive overload sense that Haiku gets wrong often.
    const callOpts = {
      systemPrompt: getExerciseVariationPrompt(locale),
      maxTokens: 1500,
      model: "smart" as const,
    };
    const parseFailureAddendum = locale === "en"
      ? `\n\nPREVIOUS RESPONSE RETURNED INVALID JSON. Reply with valid JSON only: { "alternatives": [...] }`
      : `\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "alternatives": [...] }`;

    const exec = await executeAIWithRetries({
      userMessage,
      initial: () => callAIText({ ...callOpts, userMessage }),
      retry: (msg) => callAIText({ ...callOpts, userMessage: msg }),
      consume: (raw) => validateAlternativesArray(parseAiJson(raw.text)),
      onParseFailure: async () => {
        const raw = await callAIText({ ...callOpts, userMessage: `${userMessage}${parseFailureAddendum}` });
        return { raw, result: validateAlternativesArray(parseAiJson(raw.text)) };
      },
      retries: [
        {
          buildRetryMessage: (current) => {
            if (current.length >= 3) return null;
            const missing = 3 - current.length;
            return locale === "en"
              ? `\n\nPREVIOUS RESPONSE RETURNED ${current.length} alternatives but EXACTLY 3 are required. ADD ${missing} more alternative(s).`
              : `\n\nÖNCEKİ YANITTA ${current.length} alternatif döndün, TAM 3 alternatif gerek. ${missing} alternatif EKLE.`;
          },
          shouldKeep: (prev, candidate) => candidate.length > prev.length,
        },
      ],
    });

    const alternatives = exec.result;
    inputTokens = exec.inputTokens;
    outputTokens = exec.outputTokens;

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

    await logAiUsage(user.id, "workout", {
      status: "success",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    return { currentExercise, alternatives, fromCache: false };
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(user.id, "workout", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });
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
