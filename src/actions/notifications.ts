"use server";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

export async function getNotifications() {
  const user = await getAuthUser();
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function getUnreadCount() {
  const user = await getAuthUser();
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false)
      )
    );
  return { count: result?.count ?? 0 };
}

export async function markAllAsRead() {
  const user = await getAuthUser();
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false)
      )
    );
}

export async function markAsRead(notificationId: number) {
  const user = await getAuthUser();
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.id)
      )
    );
}

export async function deleteNotification(notificationId: number) {
  const user = await getAuthUser();
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.id)
      )
    );
}
