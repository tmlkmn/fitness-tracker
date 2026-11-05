"use server";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

function getTurkeyStartOfDay(): Date {
  const nowUtc = new Date();
  const turkeyOffset = 3 * 60 * 60 * 1000;
  const turkeyNow = new Date(nowUtc.getTime() + turkeyOffset);
  return new Date(
    Date.UTC(turkeyNow.getUTCFullYear(), turkeyNow.getUTCMonth(), turkeyNow.getUTCDate()) - turkeyOffset
  );
}

export async function getNotifications() {
  const user = await getAuthUser();
  const todayStart = getTurkeyStartOfDay();
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        gte(notifications.createdAt, todayStart)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(15);
}

export async function getUnreadCount() {
  const user = await getAuthUser();
  const todayStart = getTurkeyStartOfDay();
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false),
        gte(notifications.createdAt, todayStart)
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

export async function clearAllNotifications() {
  const user = await getAuthUser();
  await db
    .delete(notifications)
    .where(eq(notifications.userId, user.id));
}
