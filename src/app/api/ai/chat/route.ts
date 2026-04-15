import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getAIClient, AI_MODELS, checkRateLimit } from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { COACH_CHAT_PROMPT } from "@/lib/ai-prompts";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  try {
    checkRateLimit(userId, "chat");
  } catch {
    return new Response("Günlük sohbet limitine ulaştınız (max 20/gün).", { status: 429 });
  }

  const body = await request.json();
  const userMessages: Array<{ role: string; content: string }> =
    body.messages ?? [];

  if (userMessages.length === 0) {
    return new Response("Mesaj gerekli.", { status: 400 });
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
    max_tokens: 512,
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
