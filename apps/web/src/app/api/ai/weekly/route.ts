import { z } from "zod";
import { requireApiUser } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/ai";
import { getUserLocale } from "@fitmusc/shared/locale";
import { generateWeeklyPlan } from "@/lib/ai-weekly-generate";

// "both" generation runs the workout + nutrition legs sequentially, each with
// up to 3 quality retries, so the worst case is ~6-8 back-to-back Sonnet calls.
// 300s clipped that; 800s is the Vercel Pro ceiling (requires Fluid Compute —
// without it Pro caps at 300 and the build rejects this value). The client-side
// abort in use-weekly-ai.ts MUST stay above this so the server's own error wins
// the race instead of a blunt client abort. NOTE: this only defers the timeout;
// it does not shorten the wait — see the A/B levers in ai-weekly-service.ts.
export const maxDuration = 800;

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

      try {
        const suggestedPlan = await generateWeeklyPlan(userId, locale, parsedBody, (ev) =>
          emit({ type: "status", ...ev }),
        );
        emit({ type: "done", suggestedPlan });
      } catch (error) {
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
