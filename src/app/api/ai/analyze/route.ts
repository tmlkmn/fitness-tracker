import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { progressLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAIClient, AI_MODELS, checkRateLimit } from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { PROGRESS_ANALYSIS_PROMPT } from "@/lib/ai-prompts";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    checkRateLimit(userId, "analyze");
  } catch {
    return new Response("Günlük analiz limitine ulaştınız (max 3/gün).", { status: 429 });
  }

  // Fetch progress data — limited to 10 for token savings
  const logs = await db
    .select()
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate))
    .limit(10);

  if (logs.length === 0) {
    return new Response("Henüz yeterli veri yok.", { status: 200 });
  }

  // Fetch user profile
  const [user] = await db
    .select({ height: users.height, weight: users.weight, targetWeight: users.targetWeight })
    .from(users)
    .where(eq(users.id, userId));

  const userContext = await buildUserContext(userId);

  // Build compact data table
  const header = "Tarih | Kilo | Yağ% | Sıvı% | BMI | Bel(cm)";
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
    .map(
      (l) =>
        `${l.logDate}: SolKol kas:${l.leftArmMuscleKg ?? "-"}kg SağKol kas:${l.rightArmMuscleKg ?? "-"}kg Gövde yağ:${l.torsoFatPercent ?? "-"}% SolBacak kas:${l.leftLegMuscleKg ?? "-"}kg SağBacak kas:${l.rightLegMuscleKg ?? "-"}kg`
    )
    .join("\n");

  const fullPrompt = `${userContext}

Profil: Boy ${user?.height ?? "?"}cm, Başlangıç ${user?.weight ?? "?"}kg, Hedef ${user?.targetWeight ?? "?"}kg

Vücut Kompozisyonu Verileri:
${dataTable}

${segmentRows ? `\nSegment Detayları:\n${segmentRows}` : ""}

Bu verileri analiz et ve kullanıcıya detaylı geri bildirim ver.`;

  const client = getAIClient();
  const stream = client.messages.stream({
    model: AI_MODELS.smart,
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: PROGRESS_ANALYSIS_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: fullPrompt }],
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error("AI stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
