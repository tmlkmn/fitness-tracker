/**
 * One weekly plan generation for a signed-in user: the service core
 * (src/lib/ai-weekly-service.ts) plus what a real request adds — saving the
 * plan as a suggestion and usage logging. Shared by the web SSE route
 * (`/api/ai/weekly`) and the mobile background job (src/lib/ai-jobs.ts).
 * The caller checks the rate limit first. Must run inside a request (or its
 * `after()`): `saveAiSuggestion` reads the session.
 */

import "server-only";
import {
  AI_MODELS,
  logAiUsage,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import type { Locale } from "@fitmusc/shared/locale";
import { saveAiSuggestion } from "@/actions/ai-suggestions";
import {
  resolveWeeklyGenerationRequest,
  buildWeeklyPrompts,
  runWeeklyGeneration,
  mergeWeeklyResults,
  type WeeklyProgressEvent,
  type WeeklyRequestInput,
} from "@/lib/ai-weekly-service";
import type { AIWeeklyPlan } from "@/lib/ai-weekly-types";
import { categorizeWarnings, isSystemNote, sampleWarnings } from "@/lib/ai-warning-telemetry";

/** "profile" before the context build, "merging" before the legs are merged. */
export type WeeklyGenerationStep =
  | { step: "profile" }
  | { step: "merging" }
  | { step: WeeklyProgressEvent["leg"]; phase: WeeklyProgressEvent["phase"] };

export async function generateWeeklyPlan(
  userId: string,
  locale: Locale,
  body: WeeklyRequestInput,
  onStep?: (step: WeeklyGenerationStep) => void,
): Promise<AIWeeklyPlan> {
  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    onStep?.({ step: "profile" });

    const req = await resolveWeeklyGenerationRequest(body, userId, locale);
    const prompts = buildWeeklyPrompts(req);

    // Bands + previous-week breakdown are computed in the resolve phase
    // (single source) and reused for both proactive prompt blocks and
    // post-validation. Per-leg lifecycle events (start/retry/done) go straight
    // to the caller so its progress view reflects real backend work — for
    // both the sequential ("both") path and single-mode requests.
    const outcome = await runWeeklyGeneration(prompts, {
      locale,
      onProgress: (ev) => onStep?.({ step: ev.leg, phase: ev.phase }),
      muscleVolumeBands: req.muscleVolumeBands,
      previousWeekBreakdown: req.previousWeekBreakdown,
      isDeloadWeek: req.deloadWeek,
    });
    totalInputTokens += outcome.inputTokens;
    totalOutputTokens += outcome.outputTokens;

    onStep?.({ step: "merging" });

    const suggestedPlan = mergeWeeklyResults(outcome, req);

    saveAiSuggestion({
      plan: suggestedPlan,
      userNote: req.rawUserNote,
      originalDate: req.monday,
    }).catch(() => {});

    try {
      const flagsAny = Object.values(outcome.retryFlags).some(Boolean);
      const deloadWeek = Boolean(body.deloadWeek);
      const carbCyclingProfile = req.resolvedTargets?.cyclingProfile.label ?? "off";
      const supplementKcal = req.supplementBudget.calories;
      const supplementsCount = req.supplementBudget.supplementsCount;
      const allWarnings = [
        ...(outcome.nutritionResult?.warnings ?? []),
        ...(outcome.workoutResult?.warnings ?? []),
      ];
      const warningCategories = categorizeWarnings(allWarnings);
      // System notes ([volume-adjusted], …) are logged but aren't problems.
      const hasCategorizedWarnings = allWarnings.some((w) => !isSystemNote(w));
      const metaPayload = {
        retryFlags: outcome.retryFlags,
        deloadWeek,
        carbCyclingProfile,
        supplementKcal,
        supplementsCount,
        warningCategories,
        warnings: sampleWarnings(allWarnings),
      };
      const cyclingActive = carbCyclingProfile !== "off";
      const supplementsActive = supplementsCount > 0;
      await logAiUsage(userId, "weekly", {
        status: flagsAny || hasCategorizedWarnings ? "success_with_warnings" : "success",
        errorMessage: flagsAny || hasCategorizedWarnings || deloadWeek || cyclingActive || supplementsActive ? JSON.stringify(metaPayload) : undefined,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        durationMs: Date.now() - startTime,
        model: AI_MODELS.smart,
        promptVersion: PROMPT_VERSION,
      });
    } catch {
      // Non-fatal
    }

    console.log(`[AI Weekly] ✓ SUCCESS (in=${totalInputTokens}, out=${totalOutputTokens}, t=${Date.now() - startTime}ms)`);
    return suggestedPlan;
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    console.error(`[AI Weekly] ✗ ERROR`, error);

    try {
      await logAiUsage(userId, "weekly", {
        status,
        errorMessage,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        durationMs: Date.now() - startTime,
        model: AI_MODELS.smart,
        promptVersion: PROMPT_VERSION,
      });
    } catch {
      // Non-fatal
    }
    throw error;
  }
}
