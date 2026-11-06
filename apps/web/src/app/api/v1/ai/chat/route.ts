import { aiChatSchema } from "@fitmusc/shared/api/schemas";
import { getUserLocale } from "@fitmusc/shared/locale";
import { apiRoute } from "@/lib/api/handler";
import { checkRateLimit } from "@/lib/ai";
import { streamCoachReply } from "@/lib/ai-coach-chat";

export const maxDuration = 60;

/**
 * Streams the coach's reply as text/plain. The question and the reply are
 * stored in the history server-side (GET /ai/chat/history).
 */
export const POST = apiRoute({ input: aiChatSchema }, async ({ input, user }) => {
  await checkRateLimit(user.id, "chat");
  return streamCoachReply(user.id, getUserLocale(user), input.messages, { persistReply: true });
});
