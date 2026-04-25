import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { progressLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAIClient, AI_MODELS, checkRateLimit, logAiUsage } from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { TARGET_WEIGHT_PROMPT } from "@/lib/ai-prompts";

export const maxDuration = 30;

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    await checkRateLimit(userId, "target-weight");
  } catch (err) {
    const msg = err instanceof Error && err.message.startsWith("COOLDOWN:")
      ? `Lütfen ${err.message.split(":")[1]} saniye bekleyin.`
      : "Günlük hedef kilo önerisi limitine ulaştınız (max 2/gün).";
    return Response.json({ error: msg }, { status: 429 });
  }

  // Fetch user profile (only fields actually used here; the rest comes via
  // buildUserContext below — fitness level + service type already render there)
  const [user] = await db
    .select({
      height: users.height,
      weight: users.weight,
      age: users.age,
      healthNotes: users.healthNotes,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return Response.json({ error: "Kullanıcı bulunamadı." }, { status: 400 });
  }

  // Fetch latest progress log
  const [latestLog] = await db
    .select({
      weight: progressLogs.weight,
      fatPercent: progressLogs.fatPercent,
      fatKg: progressLogs.fatKg,
      bmi: progressLogs.bmi,
      waistCm: progressLogs.waistCm,
      torsoFatPercent: progressLogs.torsoFatPercent,
      logDate: progressLogs.logDate,
    })
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate))
    .limit(1);

  if (!latestLog?.weight) {
    return Response.json(
      { error: "Hedef kilo önerisi için en az 1 ölçüm kaydı gerekli." },
      { status: 400 },
    );
  }

  await logAiUsage(userId, "target-weight");

  const userContext = await buildUserContext(userId);

  // userContext (via buildUserContext) already includes fitness level / service
  // type / health notes in human-readable form. We only re-state the latest
  // physical metrics here so the prompt has them concentrated near the call.
  const profileParts: string[] = [];
  if (user.height) profileParts.push(`Boy: ${user.height}cm`);
  if (user.age) profileParts.push(`Yaş: ${user.age}`);
  if (user.weight) profileParts.push(`Başlangıç kilo: ${user.weight}kg`);

  const logParts: string[] = [`Tarih: ${latestLog.logDate}`];
  if (latestLog.weight) logParts.push(`Kilo: ${latestLog.weight}kg`);
  if (latestLog.fatPercent) logParts.push(`Yağ: %${latestLog.fatPercent}`);
  if (latestLog.fatKg) logParts.push(`Yağ: ${latestLog.fatKg}kg`);
  if (latestLog.bmi) logParts.push(`BMI: ${latestLog.bmi}`);
  if (latestLog.waistCm) logParts.push(`Bel: ${latestLog.waistCm}cm`);
  if (latestLog.torsoFatPercent) logParts.push(`Gövde yağ: %${latestLog.torsoFatPercent}`);

  let healthNotesStr = "";
  if (user.healthNotes) {
    try {
      const notes = JSON.parse(user.healthNotes);
      if (Array.isArray(notes) && notes.length > 0) {
        healthNotesStr = `\nSağlık notları: ${notes.join(". ")}`;
      }
    } catch {
      healthNotesStr = `\nSağlık notları: ${user.healthNotes}`;
    }
  }

  const prompt = `${userContext}

Profil: ${profileParts.join(", ")}
Son ölçüm: ${logParts.join(", ")}${healthNotesStr}

Bu verilere göre gerçekçi bir hedef kilo öner.`;

  const client = getAIClient();

  try {
    const response = await client.messages.create({
      model: AI_MODELS.smart,
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: TARGET_WEIGHT_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: "AI yanıtı işlenemedi. Lütfen tekrar deneyin." },
        { status: 500 },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Response.json({
      targetWeight: Number(parsed.targetWeight),
      reasoning: String(parsed.reasoning),
      timelineWeeks: Number(parsed.timelineWeeks),
    });
  } catch {
    return Response.json(
      { error: "AI servisi şu anda kullanılamıyor." },
      { status: 500 },
    );
  }
}
