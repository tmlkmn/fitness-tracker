import { requireApiUser } from "@/lib/api-auth";
import {
  getAIClient,
  AI_MODELS,
  checkRateLimit,
  logAiUsage,
  discriminateAiError,
  PROMPT_VERSION,
} from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { getCoachChatPrompt, getCoachTopicGatePrompt } from "@/lib/ai-prompts";
import { getUserLocale } from "@/lib/locale";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

/**
 * Cheap topic gate run BEFORE the expensive context build + smart model call.
 * Classifies the latest user message as on-topic (fitness/nutrition/exercise)
 * or off-topic using the fast model with a tiny, cached prompt and a 4-token
 * cap. Off-topic / manipulation attempts are rejected here so they never burn
 * a full Sonnet generation. Fails OPEN (returns true) on any error so a
 * classifier outage never breaks chat — the main prompt still enforces scope.
 */
async function isOnTopicQuestion(question: string): Promise<boolean> {
  try {
    const client = getAIClient();
    const res = await client.messages.create({
      model: AI_MODELS.fast,
      max_tokens: 4,
      system: [
        {
          type: "text",
          text: getCoachTopicGatePrompt(),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: question.slice(0, 1500) }],
    });
    const decision = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .toUpperCase();
    // Default to allowing when the label is ambiguous — only an explicit DENY blocks.
    return !decision.includes("DENY");
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser();
  if (response) return response;

  const userId = user.id;
  const locale = getUserLocale(user);

  try {
    await checkRateLimit(userId, "chat");
  } catch (err) {
    const msg = err instanceof Error && err.message.startsWith("COOLDOWN:")
      ? (locale === "en"
          ? `Please wait ${err.message.split(":")[1]} seconds before sending again.`
          : `Lütfen ${err.message.split(":")[1]} saniye bekleyin.`)
      : (locale === "en"
          ? "Daily chat limit reached (max 15/day)."
          : "Günlük sohbet limitine ulaştınız (max 15/gün).");
    return new Response(msg, { status: 429 });
  }

  const body = await request.json();
  const rawMessages = body.messages;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return new Response(locale === "en" ? "Message required." : "Mesaj gerekli.", { status: 400 });
  }

  // Validate & sanitize messages
  const userMessages = rawMessages
    .filter(
      (m: unknown): m is { role: string; content: string } =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as Record<string, unknown>).role === "string" &&
        typeof (m as Record<string, unknown>).content === "string",
    )
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content.slice(0, 5000),
    }));

  if (userMessages.length === 0) {
    return new Response(locale === "en" ? "Message required." : "Mesaj gerekli.", { status: 400 });
  }

  // Save user message to DB
  const lastUserMsg = userMessages[userMessages.length - 1];
  if (lastUserMsg?.role === "user") {
    try {
      await db.insert(chatMessages).values({
        userId,
        role: "user",
        content: lastUserMsg.content,
      });
    } catch { /* silent */ }
  }

  // Topic gate — reject off-topic / manipulation attempts cheaply, before the
  // (expensive) context build and the smart model call. Only the latest user
  // question is classified. The refusal is persisted and logged as a chat use
  // so it counts toward the daily quota and deters spamming junk questions.
  if (lastUserMsg?.role === "user" && !(await isOnTopicQuestion(lastUserMsg.content))) {
    const refusal =
      locale === "en"
        ? "I can only help with sports, nutrition, training, and exercise. If you have a question on those, I'd be happy to help!"
        : "Ben sadece spor, beslenme, antrenman ve egzersiz konularında destek verebiliyorum. Bu konularda bir sorunuz varsa yardımcı olmaktan mutluluk duyarım!";
    try {
      await db.insert(chatMessages).values({
        userId,
        role: "assistant",
        content: refusal,
      });
    } catch { /* silent */ }
    await logAiUsage(userId, "chat", {
      status: "success",
      durationMs: 0,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });
    return new Response(refusal, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Build context for first message
  const userContext = await buildUserContext(userId, { forceRefresh: true, locale });

  // Construct messages array with context — limit to last 12 messages (6 turns).
  // Context is always injected into the LAST user message (the current question)
  // so it's reliably present regardless of conversation length or parity.
  const messages: Anthropic.MessageParam[] = [];
  const limited = userMessages.slice(-12);
  for (let i = 0; i < limited.length; i++) {
    const msg = limited[i];
    const role = msg.role === "assistant" ? "assistant" : "user";
    const isCurrentQuestion = i === limited.length - 1 && role === "user";
    const content = isCurrentQuestion
      ? (locale === "en"
          ? `[User Context]\n${userContext}\n\n[Question]\n${msg.content}`
          : `[Kullanıcı Bağlamı]\n${userContext}\n\n[Soru]\n${msg.content}`)
      : msg.content;
    messages.push({ role, content });
  }

  const startTime = Date.now();
  const client = getAIClient();
  const stream = client.messages.stream({
    model: AI_MODELS.smart,
    max_tokens: 3000,
    system: [
      {
        type: "text",
        text: getCoachChatPrompt(locale),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let stopReason: string | null = null;
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
          } else if (event.type === "message_delta" && event.delta.stop_reason) {
            stopReason = event.delta.stop_reason;
          } else if (event.type === "message_start") {
            inputTokens = event.message.usage?.input_tokens ?? 0;
            outputTokens = event.message.usage?.output_tokens ?? 0;
          } else if (event.type === "message_delta") {
            const u = (event as { usage?: { output_tokens?: number } }).usage;
            if (u?.output_tokens != null) outputTokens = u.output_tokens;
          }
        }
        if (stopReason === "max_tokens") {
          controller.enqueue(
            encoder.encode(
              locale === "en"
                ? "\n\n_(Response got long — ask again for the rest.)_"
                : "\n\n_(Yanıt uzun geldi, devamı için tekrar sor.)_",
            ),
          );
        }
        await logAiUsage(userId, "chat", {
          status: "success",
          inputTokens,
          outputTokens,
          durationMs: Date.now() - startTime,
          model: AI_MODELS.smart,
          promptVersion: PROMPT_VERSION,
        });
        logged = true;
      } catch (err) {
        console.error("AI chat stream error:", err);
        const { status, errorMessage } = discriminateAiError(err);
        await logAiUsage(userId, "chat", {
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
          // Defensive: stream ended without throwing but log never wrote.
          await logAiUsage(userId, "chat", {
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
