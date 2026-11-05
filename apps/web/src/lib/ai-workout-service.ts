/**
 * Daily workout generation core, split out of the `generateWorkoutReplacement`
 * server action so it can also run outside a request (the plan eval harness).
 * The action keeps auth, rate limiting, ownership and usage logging; this
 * module never logs or persists anything.
 *
 *   prepareWorkoutReplacement — load context, build the prompt.
 *   executeWorkoutReplacement — AI call + retries + deterministic fallbacks
 *                               + weekly-aggregate parity warnings.
 */

import "server-only";
import { db } from "@/db";
import { dailyPlans, weeklyPlans, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AIExercise } from "@/actions/ai-workout";
import type { Locale } from "@/lib/locale";
import {
  callAIText,
  executeAIWithRetries,
  type AIEffort,
  type ExecuteResult,
} from "@/lib/ai-runtime";
import { AI_EFFORT, AI_MAX_TOKENS, AI_RETRY_TIMEOUT_MS, AI_TIMEOUTS } from "@/lib/ai-config";
import { DAILY_EXERCISES_SCHEMA } from "@/lib/ai-output-schemas";
import { buildWorkoutReplacementPrompt } from "@/lib/ai-prompt-builders";
import { buildUserContext } from "@/lib/ai-context";
import { buildWeeklyWorkoutContext } from "@/lib/ai-workout-context";
import { getWorkoutReplacePrompt } from "@/lib/ai-prompts";
import {
  validateDailyExerciseArray,
  dailyExercisesNeedRetry,
  buildDailyExercisesRetryNudge,
  scoreExerciseValidationGaps,
} from "@/lib/ai-daily-validators";
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
import { normalizeReps } from "@/lib/ai-weekly-postprocess";
import { resolveExerciseDemos } from "@/lib/exercise-demo-service";
import {
  buildVolumeBandsBlock,
  buildPreviousVolumeBlock,
} from "@/lib/workout-targets-block";

type ExerciseValidation = ReturnType<typeof validateDailyExerciseArray>;
type WorkoutContext = Awaited<ReturnType<typeof buildWeeklyWorkoutContext>>;

export interface PrepareWorkoutReplacementInput {
  userId: string;
  locale: Locale;
  dailyPlanId: number;
  userNote?: string;
}

export interface PreparedWorkoutReplacement {
  userId: string;
  dailyPlanId: number;
  locale: Locale;
  userMessage: string;
  planType: WorkoutContext["planType"];
  /** The day's exercises before regeneration, for the comparison view. */
  currentDayExercises: WorkoutContext["exercises"];
  requiredSections: string[];
  minExerciseCount: number;
}

export async function prepareWorkoutReplacement(
  input: PrepareWorkoutReplacementInput,
): Promise<PreparedWorkoutReplacement> {
  const { userId, locale, dailyPlanId, userNote } = input;

  const [userContext, { context: workoutContext, exercises: currentDayExercises, planType }] =
    await Promise.all([
      buildUserContext(userId, { locale }),
      buildWeeklyWorkoutContext(dailyPlanId),
    ]);

  const mode: "Replacement" | "Generation" = currentDayExercises.length > 0 ? "Replacement" : "Generation";

  // Proactive prompt blocks — same bands + previous-week breakdown the
  // post-validation will check against. Computed once here and reused by
  // appendAggregateWarnings after the AI call so the user sees consistent
  // numbers in both the AI's plan and the warning text.
  const proactive = await loadProactiveWorkoutContext(userId, dailyPlanId);
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

  return {
    userId,
    dailyPlanId,
    locale,
    userMessage,
    planType,
    currentDayExercises,
    requiredSections,
    minExerciseCount,
  };
}

export interface WorkoutReplacementOutcome {
  suggestedExercises: AIExercise[];
  warnings: string[];
  exec: ExecuteResult<ExerciseValidation>;
}

export async function executeWorkoutReplacement(
  prep: PreparedWorkoutReplacement,
  opts: { effort?: AIEffort } = {},
): Promise<WorkoutReplacementOutcome> {
  const { locale, userMessage, planType, requiredSections, minExerciseCount } = prep;

  const callOpts = {
    systemPrompt: getWorkoutReplacePrompt(locale),
    maxTokens: AI_MAX_TOKENS.workoutReplace,
    model: "smart" as const,
    effort: opts.effort ?? AI_EFFORT.workoutReplace,
    outputSchema: DAILY_EXERCISES_SCHEMA,
    // Applies to the initial call; retries and the parse-fail call override it.
    timeoutMs: AI_TIMEOUTS.workoutReplaceCall,
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
    score: scoreExerciseValidationGaps,
  });

  const validation = exec.result;

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

  // Clean rep counts (11->12, 14->15, 18->20) so the preview the user reviews
  // and the persisted day match the weekly flow's normalized reps. Ranges and
  // AMRAP pass through untouched.
  suggestedExercises = suggestedExercises.map((ex) => ({
    ...ex,
    reps: normalizeReps(ex.reps),
  }));

  // Weekly-aggregate parity check — combine the AI's suggestion with the
  // other 6 days of the user's current week and run the same validators
  // the weekly flow uses (muscle volume bands, per-muscle/per-pattern
  // progressive overload). Soft warnings only; the user still chooses
  // whether to apply. Skipped when the daily plan has no parent weekly
  // (free-standing day).
  if (planType === "workout" || planType === "swimming") {
    try {
      await appendAggregateWarnings({
        userId: prep.userId,
        dailyPlanId: prep.dailyPlanId,
        suggestedExercises,
        warnings: validation.warnings,
      });
    } catch (err) {
      console.warn("[AI Workout] aggregate validation failed:", err);
    }
  }

  return { suggestedExercises, warnings: validation.warnings, exec };
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

  // Fill the taxonomy cache for the week's working exercises first —
  // exercises without an exercise_demos row aren't counted by the checks.
  try {
    await resolveExerciseDemos(
      aggregate.plan.days
        .flatMap((d) => d.exercises)
        .filter((e) => e.section === "main" || e.section === "swimming")
        .flatMap((e) => (e.englishName ? [e.englishName] : [])),
    );
  } catch (err) {
    console.warn("[AI Workout] exercise demo resolve failed:", err);
  }

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
