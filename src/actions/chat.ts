"use server";

import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

export async function getChatHistory(limit = 50) {
  const user = await getAuthUser();

  const messages = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.userId, user.id))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  // Reverse to get chronological order
  return messages.reverse();
}

export async function saveChatMessage(role: string, content: string) {
  const user = await getAuthUser();

  await db.insert(chatMessages).values({
    userId: user.id,
    role,
    content,
  });
}

export async function clearChatHistory() {
  const user = await getAuthUser();

  await db
    .delete(chatMessages)
    .where(eq(chatMessages.userId, user.id));
}
