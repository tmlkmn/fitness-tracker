"use server";

import { db } from "@/db";
import { exercises, exerciseAlternatives, dailyPlans, weeklyPlans, users } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  AI_MODELS,
  checkRateLimit,
  logAiUsage,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import { callAIText, executeAIWithRetries, buildExecMetadata } from "@/lib/ai-runtime";
import {
  AI_MAX_TOKENS,
  AI_RETRY_TIMEOUT_MS,
  EXERCISE_ALTERNATIVES_TTL_DAYS,
} from "@/lib/ai-config";
import {
  buildWorkoutReplacementPrompt,
  buildSectionReplacementPrompt,
  buildExerciseVariationPrompt,
} from "@/lib/ai-prompt-builders";
import {
  replaceExercisesForDay,
  replaceSectionExercises,
} from "@/lib/ai-persistence";
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
  safeInteger,
  safeNullableText,
  safeString,
} from "@/lib/ai-shape-validators";
import { parseAiJson } from "@/lib/ai-json-repair";
import { buildFallbackSections, type FallbackPlanType } from "@/lib/workout-fallback-sections";
import { buildWeeklyAggregateForDailyValidation } from "@/lib/daily-workout-aggregate";
import {
  assessMuscleVolume,
  getMuscleVolumeBands,
} from "@/lib/muscle-volume-validator";
import {
  assessPerMuscleProgressiveOverload,
  assessPerPatternProgressiveOverload,
  bucketSetsByPattern,
  type BucketOverloadAssessment,
} from "@/lib/progressive-overload-validator";
import { loadPreviousWeekVolumeBreakdown } from "@/lib/ai-weekly-service";
import {
  buildVolumeBandsBlock,
  buildPreviousVolumeBlock,
} from "@/lib/workout-targets-block";

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
  intensity?: "low" | "moderate" | "high" | null;
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
    name: safeString(ex.name),
    englishName: safeNullableText(ex.englishName),
    sets: safeInteger(ex.sets),
    reps: safeNullableText(ex.reps),
    restSeconds: sanitizeRestSeconds(ex.restSeconds, `alternatives[${i}]`, warnings),
    durationMinutes: sanitizeDurationMinutes(ex.durationMinutes, `alternatives[${i}]`, warnings),
    notes: safeNullableText(ex.notes),
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

  const mode: "Replacement" | "Generation" = currentDayExercises.length > 0 ? "Replacement" : "Generation";

  // Proactive prompt blocks — same bands + previous-week breakdown the
  // post-validation will check against. Computed once here and reused by
  // appendAggregateWarnings after the AI call so the user sees consistent
  // numbers in both the AI's plan and the warning text.
  const proactive = await loadProactiveWorkoutContext(user.id, dailyPlanId);
  const volumeBandsBlock = proactive
    ? buildVolumeBandsBlock(proactive.bands, locale)
    : "";
  const previousVolumeBlock = proactive
    ? buildPreviousVolumeBlock(proactive.previousBreakdown, locale)
    : "";

  const userMessage = buildWorkoutReplacementPrompt({
    locale,
    userContext,
    workoutContext,
    planType,
    mode,
    userNote: userNote ?? null,
    volumeBandsBlock,
    previousVolumeBlock,
  });

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
      maxTokens: AI_MAX_TOKENS.workoutReplace,
      model: "smart" as const,
    };
    const parseFailureAddendum = locale === "en"
      ? `\n\nPREVIOUS RESPONSE RETURNED INVALID JSON. Reply with valid JSON only: { "exercises": [...] }`
      : `\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "exercises": [...] }`;
    const validatorOpts = { requiredSections, minExerciseCount };

    const exec = await executeAIWithRetries({
      userMessage,
      initial: () => callAIText({ ...callOpts, userMessage }),
      retry: (msg, step) => callAIText({ ...callOpts, userMessage: msg, timeoutMs: step.timeoutMs }),
      consume: (raw) => validateDailyExerciseArray(parseAiJson(raw.text), validatorOpts),
      onParseFailure: async () => {
        const raw = await callAIText({
          ...callOpts,
          userMessage: `${userMessage}${parseFailureAddendum}`,
          timeoutMs: AI_RETRY_TIMEOUT_MS.workoutReplace,
        });
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
          timeoutMs: AI_RETRY_TIMEOUT_MS.workoutReplace,
        },
      ],
    });

    const validation = exec.result;
    inputTokens = exec.inputTokens;
    outputTokens = exec.outputTokens;

    // Deterministic fallback for warmup/cooldown when the AI still omits
    // them after the retry pass. We never synthesize main/swimming work —
    // that's the AI's job — only the bookend sections so the user never
    // gets a training day missing its warmup or cooldown entirely.
    let suggestedExercises: AIExercise[] = validation.exercises as AIExercise[];
    const missingBookends = validation.missingSections.filter(
      (s) => s === "warmup" || s === "cooldown",
    );
    if (
      missingBookends.length > 0 &&
      (planType === "workout" || planType === "swimming")
    ) {
      const fallback = buildFallbackSections(
        missingBookends,
        planType as FallbackPlanType,
      );
      if (fallback.length > 0) {
        validation.warnings.push(
          `[daily-fallback] injected ${missingBookends.join(",")} template(s) after retry — AI omitted these section(s)`,
        );
        suggestedExercises = [
          ...(fallback as unknown as AIExercise[]),
          ...suggestedExercises,
        ];
      }
    }

    if (suggestedExercises.length === 0) {
      validation.warnings.push(
        `[daily-empty-day] AI returned no exercises for planType "${planType}" — applying would create an empty training day`,
      );
    }

    // Weekly-aggregate parity check — combine the AI's suggestion with the
    // other 6 days of the user's current week and run the same validators
    // the weekly flow uses (muscle volume bands, per-muscle/per-pattern
    // progressive overload). Soft warnings only; the user still chooses
    // whether to apply. Skipped when the daily plan has no parent weekly
    // (free-standing day).
    if (planType === "workout" || planType === "swimming") {
      try {
        await appendAggregateWarnings({
          userId: user.id,
          dailyPlanId,
          suggestedExercises,
          warnings: validation.warnings,
        });
      } catch (err) {
        console.warn("[AI Workout] aggregate validation failed:", err);
      }
    }

    const hasWarnings = validation.warnings.length > 0;

    await logAiUsage(user.id, "workout", {
      status: hasWarnings ? "success_with_warnings" : "success",
      errorMessage: buildExecMetadata(exec, validation.warnings),
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });

    return {
      currentExercises: currentDayExercises,
      suggestedExercises,
      validationWarnings: validation.warnings.slice(),
    };
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

/**
 * Pre-AI-call helper: load the bands + previous-week breakdown the daily
 * workout flow needs for both proactive prompt injection and post-validation.
 * Returns null when the daily plan has no parent weekly (free-standing day)
 * — caller skips both injection and aggregate warnings.
 */
async function loadProactiveWorkoutContext(
  userId: string,
  dailyPlanId: number,
): Promise<{
  bands: ReturnType<typeof getMuscleVolumeBands>;
  previousBreakdown: Awaited<ReturnType<typeof loadPreviousWeekVolumeBreakdown>>;
  weeklyPlanId: number;
  weekNumber: number;
  isDeloadWeek: boolean;
} | null> {
  const [planRow] = await db
    .select({ weeklyPlanId: dailyPlans.weeklyPlanId })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));
  if (!planRow?.weeklyPlanId) return null;

  const [weekRow] = await db
    .select({
      id: weeklyPlans.id,
      weekNumber: weeklyPlans.weekNumber,
      phase: weeklyPlans.phase,
    })
    .from(weeklyPlans)
    .where(eq(weeklyPlans.id, planRow.weeklyPlanId));
  if (!weekRow) return null;

  const isDeloadWeek = weekRow.phase.trim().toLowerCase() === "deload";

  const allDays = await db
    .select({ planType: dailyPlans.planType })
    .from(dailyPlans)
    .where(eq(dailyPlans.weeklyPlanId, planRow.weeklyPlanId));
  const trainingDayCount = allDays.filter(
    (d) => d.planType === "workout" || d.planType === "swimming",
  ).length;

  const [profile] = await db
    .select({
      fitnessLevel: users.fitnessLevel,
      fitnessGoal: users.fitnessGoal,
    })
    .from(users)
    .where(eq(users.id, userId));

  const bands = getMuscleVolumeBands({
    fitnessLevel: profile?.fitnessLevel ?? null,
    fitnessGoal: profile?.fitnessGoal ?? null,
    deloadWeek: isDeloadWeek,
    trainingDayCount,
  });

  const previousBreakdown = await loadPreviousWeekVolumeBreakdown(
    userId,
    weekRow.weekNumber,
  );

  return {
    bands,
    previousBreakdown,
    weeklyPlanId: planRow.weeklyPlanId,
    weekNumber: weekRow.weekNumber,
    isDeloadWeek,
  };
}

async function appendAggregateWarnings(input: {
  userId: string;
  dailyPlanId: number;
  suggestedExercises: AIExercise[];
  warnings: string[];
}): Promise<void> {
  const { dailyPlanId, suggestedExercises, warnings } = input;
  const aggregate = await buildWeeklyAggregateForDailyValidation(
    dailyPlanId,
    suggestedExercises,
  );
  if (!aggregate) return;

  const proactive = await loadProactiveWorkoutContext(input.userId, dailyPlanId);
  if (!proactive) return;

  const volReport = await assessMuscleVolume(aggregate.plan, proactive.bands);
  for (const w of volReport.warnings) {
    warnings.push(`[daily-muscle-volume] ${w}`);
  }

  // No prior week → progressive overload check sits out.
  if (proactive.previousBreakdown.total <= 0) return;

  const perMuscle = assessPerMuscleProgressiveOverload({
    current: volReport.totals,
    previous: proactive.previousBreakdown.byMuscle,
    isDeloadWeek: proactive.isDeloadWeek,
  });
  pushBucketWarnings(warnings, perMuscle, "daily-muscle-overload");

  const currentByPattern = bucketSetsByPattern(aggregate.plan);
  const perPattern = assessPerPatternProgressiveOverload({
    current: currentByPattern,
    previous: proactive.previousBreakdown.byPattern,
    isDeloadWeek: proactive.isDeloadWeek,
  });
  pushBucketWarnings(warnings, perPattern, "daily-pattern-overload");
}

function pushBucketWarnings(
  warnings: string[],
  assessment: BucketOverloadAssessment,
  tag: string,
): void {
  if (assessment.ok || assessment.issues.length === 0) return;
  for (const issue of assessment.issues) {
    warnings.push(`[${tag}] ${issue.warning}`);
  }
}

export async function applyWorkoutReplacement(
  dailyPlanId: number,
  newExercises: AIExercise[],
) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  // Rest-day contract: if the day is a rest day, exercises MUST be empty.
  // The generator already enforces this via requiredSections=[], but the
  // apply path defends against any caller passing non-empty exercises.
  const [dayRow] = await db
    .select({ planType: dailyPlans.planType })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));
  const effectiveExercises =
    dayRow?.planType === "rest" ? [] : newExercises;

  await replaceExercisesForDay(dailyPlanId, effectiveExercises);
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

  const userMessage = buildSectionReplacementPrompt({
    locale,
    userContext,
    slimContext: slim.context,
    planType: slim.planType,
    section,
    sectionLabel,
    userNote: userNote ?? null,
  });

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
      maxTokens: AI_MAX_TOKENS.workoutSection,
      model: "smart" as const,
    };
    const parseFailureAddendum = locale === "en"
      ? `\n\nPREVIOUS RESPONSE RETURNED INVALID JSON. Reply with valid JSON only: { "exercises": [...] }`
      : `\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "exercises": [...] }`;

    const exec = await executeAIWithRetries({
      userMessage,
      initial: () => callAIText({ ...callOpts, userMessage }),
      retry: (msg, step) => callAIText({ ...callOpts, userMessage: msg, timeoutMs: step.timeoutMs }),
      consume: (raw) => validateDailyExerciseArray(parseAiJson(raw.text), validatorOptions),
      onParseFailure: async () => {
        const raw = await callAIText({
          ...callOpts,
          userMessage: `${userMessage}${parseFailureAddendum}`,
          timeoutMs: AI_RETRY_TIMEOUT_MS.workoutSection,
        });
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
          timeoutMs: AI_RETRY_TIMEOUT_MS.workoutSection,
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
      errorMessage: buildExecMetadata(exec, validation.warnings),
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
  const filtered = newExercises.filter((ex) => ex.section === section);
  await replaceSectionExercises(dailyPlanId, section, filtered);
  revalidatePath("/");
}


// ─── Feature 3: Single Exercise Variation (3 alternatives, cached) ───────────

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

  // Cache key now includes section so the same exercise name returns
  // section-appropriate alternatives (e.g. bench press in main vs warmup
  // should get different suggestions). Equipment is not on the schema yet;
  // section is the strongest discriminator we have today.
  const nameNorm = `${currentExercise.name.toLowerCase().trim()}:${currentExercise.section}`;
  const hasUserNote = Boolean(userNote?.trim());

  // Cache lookup — skip when user provided a note (note-driven alternatives
  // are request-specific and must not be cached). Also skip on forceRefresh.
  if (!forceRefresh && !hasUserNote) {
    const ttlCutoff = new Date(
      Date.now() - EXERCISE_ALTERNATIVES_TTL_DAYS * 24 * 60 * 60 * 1000,
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

  const userMessage = buildExerciseVariationPrompt({
    locale,
    userContext,
    alternativesContext: slimContext,
    exerciseDetail,
    userNote: userNote ?? null,
  });

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    // H1: use smart model — alternative selection needs anatomical reasoning
    // and progressive overload sense that Haiku gets wrong often.
    const callOpts = {
      systemPrompt: getExerciseVariationPrompt(locale),
      maxTokens: AI_MAX_TOKENS.workoutVariation,
      model: "smart" as const,
    };
    const parseFailureAddendum = locale === "en"
      ? `\n\nPREVIOUS RESPONSE RETURNED INVALID JSON. Reply with valid JSON only: { "alternatives": [...] }`
      : `\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver: { "alternatives": [...] }`;

    const exec = await executeAIWithRetries({
      userMessage,
      initial: () => callAIText({ ...callOpts, userMessage }),
      retry: (msg, step) => callAIText({ ...callOpts, userMessage: msg, timeoutMs: step.timeoutMs }),
      consume: (raw) => validateAlternativesArray(parseAiJson(raw.text)),
      onParseFailure: async () => {
        const raw = await callAIText({
          ...callOpts,
          userMessage: `${userMessage}${parseFailureAddendum}`,
          timeoutMs: AI_RETRY_TIMEOUT_MS.workoutVariation,
        });
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
          timeoutMs: AI_RETRY_TIMEOUT_MS.workoutVariation,
        },
      ],
    });

    // Exact-3 normalization: AI sometimes returns 4-5 alternatives despite
    // the "exactly 3" instruction. Truncate (don't retry — fewer than 3 is
    // also acceptable to ship; UI tolerates ≤3 placeholders).
    let alternatives = exec.result;
    if (alternatives.length > 3) {
      console.warn(
        `[generateExerciseVariation] AI returned ${alternatives.length} alternatives, truncating to 3`,
      );
      alternatives = alternatives.slice(0, 3);
    } else if (alternatives.length < 3) {
      console.warn(
        `[generateExerciseVariation] AI returned only ${alternatives.length} alternative(s); UI will pad with placeholders`,
      );
    }
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
      errorMessage: buildExecMetadata(exec),
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
