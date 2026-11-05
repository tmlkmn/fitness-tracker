import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/db";
import { progressLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  getAIClient,
  AI_MODELS,
  checkRateLimit,
  logAiUsage,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { getProgressAnalysisPrompt } from "@/lib/ai-prompts";
import { getUserLocale } from "@/lib/locale";

export const maxDuration = 60;

export async function POST() {
  const { user: sessionUser, response } = await requireApiUser();
  if (response) return response;

  const userId = sessionUser.id;
  const locale = getUserLocale(sessionUser);

  try {
    await checkRateLimit(userId, "analyze");
  } catch (err) {
    const msg = err instanceof Error && err.message.startsWith("COOLDOWN:")
      ? (locale === "en"
          ? `Please wait ${err.message.split(":")[1]} seconds before retrying.`
          : `Lütfen ${err.message.split(":")[1]} saniye bekleyin.`)
      : (locale === "en"
          ? "Daily analysis limit reached (max 3/day)."
          : "Günlük analiz limitine ulaştınız (max 3/gün).");
    return new Response(msg, { status: 429 });
  }

  // Fetch progress data — limited to 10 for token savings
  const logs = await db
    .select()
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate))
    .limit(10);

  if (logs.length === 0) {
    return new Response(
      locale === "en" ? "Not enough data yet." : "Henüz yeterli veri yok.",
      { status: 200 },
    );
  }

  // Fetch user profile
  const [user] = await db
    .select({ height: users.height, weight: users.weight, targetWeight: users.targetWeight, serviceType: users.serviceType })
    .from(users)
    .where(eq(users.id, userId));

  const userContext = await buildUserContext(userId, { locale });

  // Build compact data table
  const header = locale === "en"
    ? "Date | Weight | Fat% | Fluid% | BMI | Waist(cm)"
    : "Tarih | Kilo | Yağ% | Sıvı% | BMI | Bel(cm)";
  const rows = logs
    .map((l) =>
      [
        l.logDate,
        l.weight ?? "-",
        l.fatPercent ?? "-",
        l.fluidPercent ?? "-",
        l.bmi ?? "-",
        l.waistCm ?? "-",
      ].join(" | ")
    )
    .join("\n");

  const dataTable = `${header}\n${rows}`;

  // Build detailed body segment data — limited to 3
  const segmentRows = logs
    .filter((l) => l.leftArmMuscleKg || l.torsoFatPercent)
    .slice(0, 3)
    .map((l) =>
      locale === "en"
        ? `${l.logDate}: L-arm muscle:${l.leftArmMuscleKg ?? "-"}kg R-arm muscle:${l.rightArmMuscleKg ?? "-"}kg Trunk fat:${l.torsoFatPercent ?? "-"}% L-leg muscle:${l.leftLegMuscleKg ?? "-"}kg R-leg muscle:${l.rightLegMuscleKg ?? "-"}kg`
        : `${l.logDate}: SolKol kas:${l.leftArmMuscleKg ?? "-"}kg SağKol kas:${l.rightArmMuscleKg ?? "-"}kg Gövde yağ:${l.torsoFatPercent ?? "-"}% SolBacak kas:${l.leftLegMuscleKg ?? "-"}kg SağBacak kas:${l.rightLegMuscleKg ?? "-"}kg`,
    )
    .join("\n");

  const fullPrompt = locale === "en"
    ? `${userContext}

Profile: Height ${user?.height ?? "?"}cm, Start ${user?.weight ?? "?"}kg, Target ${user?.targetWeight ?? "?"}kg
Service Type: ${user?.serviceType === "nutrition" ? "Nutrition Only" : "Full Program (Training + Nutrition)"}

Body Composition Data:
${dataTable}

${segmentRows ? `\nSegment Details:\n${segmentRows}` : ""}

Analyze this data and provide detailed feedback to the user.`
    : `${userContext}

Profil: Boy ${user?.height ?? "?"}cm, Başlangıç ${user?.weight ?? "?"}kg, Hedef ${user?.targetWeight ?? "?"}kg
Hizmet Tipi: ${user?.serviceType === "nutrition" ? "Sadece Beslenme" : "Tam Program (Antrenman + Beslenme)"}

Vücut Kompozisyonu Verileri:
${dataTable}

${segmentRows ? `\nSegment Detayları:\n${segmentRows}` : ""}

Bu verileri analiz et ve kullanıcıya detaylı geri bildirim ver.`;

  const startTime = Date.now();
  const client = getAIClient();
  const stream = client.messages.stream({
    model: AI_MODELS.smart,
    max_tokens: 3000,
    system: [
      {
        type: "text",
        text: getProgressAnalysisPrompt(locale),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: fullPrompt }],
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let inputTokens = 0;
      let outputTokens = 0;
      let logged = false;
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          } else if (event.type === "message_start") {
            inputTokens = event.message.usage?.input_tokens ?? 0;
            outputTokens = event.message.usage?.output_tokens ?? 0;
          } else if (event.type === "message_delta") {
            const u = (event as { usage?: { output_tokens?: number } }).usage;
            if (u?.output_tokens != null) outputTokens = u.output_tokens;
          }
        }
        await logAiUsage(userId, "analyze", {
          status: "success",
          inputTokens,
          outputTokens,
          durationMs: Date.now() - startTime,
          model: AI_MODELS.smart,
          promptVersion: PROMPT_VERSION,
        });
        logged = true;
      } catch (err) {
        console.error("AI analyze stream error:", err);
        const { status, errorMessage } = discriminateAiError(err);
        await logAiUsage(userId, "analyze", {
          status,
          errorMessage,
          inputTokens,
          outputTokens,
          durationMs: Date.now() - startTime,
          model: AI_MODELS.smart,
          promptVersion: PROMPT_VERSION,
        });
        logged = true;
      } finally {
        if (!logged) {
          await logAiUsage(userId, "analyze", {
            status: "api_error",
            errorMessage: "stream ended without completion",
            durationMs: Date.now() - startTime,
            model: AI_MODELS.smart,
            promptVersion: PROMPT_VERSION,
          });
        }
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
