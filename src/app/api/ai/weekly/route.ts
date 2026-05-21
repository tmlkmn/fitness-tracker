import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import {
  AI_MODELS,
  checkRateLimit,
  logAiUsage,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import { getUserLocale } from "@/lib/locale";
import { saveAiSuggestion } from "@/actions/ai-suggestions";
import {
  resolveWeeklyGenerationRequest,
  buildWeeklyPrompts,
  runWeeklyGeneration,
  mergeWeeklyResults,
} from "@/lib/ai-weekly-service";
import { categorizeWarnings } from "@/lib/ai-warning-telemetry";

export const maxDuration = 300;

const RequestBodySchema = z.object({
  dateStr: z.string().min(1, "Tarih gerekli."),
  userNote: z.string().max(2000).optional(),
  generateMode: z.enum(["both", "nutrition", "workout"]).optional(),
  dayModes: z.record(
    z.string().regex(/^[0-6]$/),
    z.enum(["workout", "swimming", "rest", "nutrition"]),
  ).optional(),
  pastDows: z.array(z.number().int().min(0).max(6)).optional(),
  deloadWeek: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;
  const userId = user.id;
  const locale = getUserLocale(user);

  let parsedBody: z.infer<typeof RequestBodySchema>;
  try {
    const raw = await request.json();
    parsedBody = RequestBodySchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Geçersiz istek.", details: err.issues }, { status: 400 });
    }
    return Response.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  try {
    await checkRateLimit(userId, "weekly");
  } catch (err) {
    const msg = err instanceof Error && err.message.startsWith("COOLDOWN:")
      ? `Lütfen ${err.message.split(":")[1]} saniye bekleyin.`
      : "Günlük haftalık plan limitine ulaştınız (max 2/gün).";
    return Response.json({ error: msg }, { status: 429 });
  }

  const startTime = Date.now();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller already closed
        }
      };

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      try {
        emit({ type: "status", step: "profile" });

        const req = await resolveWeeklyGenerationRequest(parsedBody, userId, locale);
        const prompts = buildWeeklyPrompts(req);

        // Bands + previous-week breakdown are computed in the resolve phase
        // (single source) and reused for both proactive prompt blocks and
        // post-validation. The route just forwards them to runWeeklyGeneration.
        // Per-leg lifecycle events (start/retry/done) are streamed straight to
        // the client so the progress overlay reflects real backend work — for
        // both the sequential ("both") path and single-mode requests.
        const outcome = await runWeeklyGeneration(prompts, {
          locale,
          onProgress: (ev) =>
            emit({ type: "status", step: ev.leg, phase: ev.phase }),
          muscleVolumeBands: req.muscleVolumeBands,
          previousWeekBreakdown: req.previousWeekBreakdown,
          isDeloadWeek: req.deloadWeek,
        });
        totalInputTokens += outcome.inputTokens;
        totalOutputTokens += outcome.outputTokens;

        emit({ type: "status", step: "merging" });

        const suggestedPlan = mergeWeeklyResults(outcome, req);

        saveAiSuggestion({
          plan: suggestedPlan,
          userNote: req.rawUserNote,
          originalDate: req.monday,
        }).catch(() => {});

        try {
          const flagsAny = Object.values(outcome.retryFlags).some(Boolean);
          const deloadWeek = Boolean(parsedBody.deloadWeek);
          const carbCyclingProfile = req.resolvedTargets?.cyclingProfile.label ?? "off";
          const supplementKcal = req.supplementBudget.calories;
          const supplementsCount = req.supplementBudget.supplementsCount;
          const allWarnings = [
            ...(outcome.nutritionResult?.warnings ?? []),
            ...(outcome.workoutResult?.warnings ?? []),
          ];
          const warningCategories = categorizeWarnings(allWarnings);
          const hasCategorizedWarnings = Object.keys(warningCategories).length > 0;
          const metaPayload = {
            retryFlags: outcome.retryFlags,
            deloadWeek,
            carbCyclingProfile,
            supplementKcal,
            supplementsCount,
            warningCategories,
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
        emit({ type: "done", suggestedPlan });
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

        const userFacingError = error instanceof Error && error.message && !error.message.startsWith("[")
          ? error.message
          : "AI servisi şu anda kullanılamıyor. Lütfen tekrar deneyin.";

        emit({ type: "error", error: userFacingError });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
