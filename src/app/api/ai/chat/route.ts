import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getAIClient, AI_MODELS, checkRateLimit, logAiUsage } from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { COACH_CHAT_PROMPT } from "@/lib/ai-prompts";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    await checkRateLimit(userId, "chat");
  } catch {
    return new Response("Günlük sohbet limitine ulaştınız (max 15/gün).", { status: 429 });
  }

  await logAiUsage(userId, "chat");

  const body = await request.json();
  const rawMessages = body.messages;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return new Response("Mesaj gerekli.", { status: 400 });
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
    return new Response("Mesaj gerekli.", { status: 400 });
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

  // Build context for first message
  const userContext = await buildUserContext(userId);

  // Construct messages array with context — limit to last 12 messages (6 turns)
  const messages: Anthropic.MessageParam[] = [];

  if (userMessages.length === 1) {
    messages.push({
      role: "user",
      content: `[Kullanıcı Bağlamı]\n${userContext}\n\n[Soru]\n${userMessages[0].content}`,
    });
  } else {
    const limited = userMessages.slice(-12);
    for (let i = 0; i < limited.length; i++) {
      const msg = limited[i];
      const role = msg.role === "assistant" ? "assistant" : "user";
      const content =
        i === 0 && role === "user"
          ? `[Kullanıcı Bağlamı]\n${userContext}\n\n[Soru]\n${msg.content}`
          : msg.content;
      messages.push({ role, content });
    }
  }

  const client = getAIClient();
  const stream = client.messages.stream({
    model: AI_MODELS.smart,
    max_tokens: 3000,
    system: [
      {
        type: "text",
        text: COACH_CHAT_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let stopReason: string | null = null;
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          } else if (event.type === "message_delta" && event.delta.stop_reason) {
            stopReason = event.delta.stop_reason;
          }
        }
        if (stopReason === "max_tokens") {
          controller.enqueue(
            encoder.encode("\n\n_(Yanıt uzun geldi, devamı için tekrar sor.)_"),
          );
        }
      } catch (err) {
        console.error("AI chat stream error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
