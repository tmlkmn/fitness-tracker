/**
 * AI target-weight suggestion, shared by the web route (`/api/ai/target-weight`)
 * and the mobile API (`/api/v1/ai/target-weight`). The caller authenticates and
 * checks the "target-weight" rate limit.
 *
 * Throws (as `Error.message`): "NOT_FOUND" (no user row), "NOT_ENOUGH_DATA" (no
 * progress log with a weight yet), "AI_EMPTY_RESPONSE" (no JSON in the reply),
 * "AI_UNAVAILABLE" (the call or its JSON failed).
 */

import "server-only";
import { db } from "@/db";
import { progressLogs, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  getAIClient,
  AI_MODELS,
  logAiUsage,
  discriminateAiError,
  PROMPT_VERSION,
  extractText,
} from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { getTargetWeightPrompt } from "@/lib/ai-prompts";
import type { Locale } from "@fitmusc/shared/locale";

export interface TargetWeightSuggestion {
  targetWeight: number;
  reasoning: string;
  timelineWeeks: number;
}

export async function suggestTargetWeight(
  userId: string,
  locale: Locale,
): Promise<TargetWeightSuggestion> {
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

  if (!user) throw new Error("NOT_FOUND");

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

  if (!latestLog?.weight) throw new Error("NOT_ENOUGH_DATA");

  const userContext = await buildUserContext(userId, { locale });

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
  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  let parsed: Record<string, unknown>;
  try {
    const response = await client.messages.create({
      model: AI_MODELS.smart,
      max_tokens: 1000,
      system: [
        {
          type: "text",
          text: getTargetWeightPrompt(locale),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: prompt }],
    });

    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;

    const text = extractText(response.content);

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      await logAiUsage(userId, "target-weight", {
        status: "parse_error",
        errorMessage: "no JSON object in response",
        inputTokens,
        outputTokens,
        durationMs: Date.now() - startTime,
        model: AI_MODELS.smart,
        promptVersion: PROMPT_VERSION,
      });
      throw new Error("AI_EMPTY_RESPONSE");
    }

    parsed = JSON.parse(jsonMatch[0]);

    await logAiUsage(userId, "target-weight", {
      status: "success",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_EMPTY_RESPONSE") throw error;
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(userId, "target-weight", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.smart,
      promptVersion: PROMPT_VERSION,
    });
    throw new Error("AI_UNAVAILABLE");
  }

  return {
    targetWeight: Number(parsed.targetWeight),
    reasoning: String(parsed.reasoning),
    timelineWeeks: Number(parsed.timelineWeeks),
  };
}
