import { db } from "@/db";
import {
  notifications,
  notificationPreferences,
  pushSubscriptions,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendNotificationEmail } from "@/lib/email";
import { sendPushNotification } from "@/lib/web-push";

export async function sendNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
  skipEmail?: boolean;
}): Promise<void> {
  const { userId, type, title, body, link, metadata, skipEmail } = params;

  // Get user preferences (defaults: all enabled)
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  const inAppEnabled = prefs?.inAppEnabled ?? true;
  const emailEnabled = prefs?.emailEnabled ?? true;
  const pushEnabled = prefs?.pushEnabled ?? true;

  // 1. In-app notification
  if (inAppEnabled) {
    await db.insert(notifications).values({
      userId,
      type,
      title,
      body,
      link,
      metadata,
    });
  }

  // 2. Email notification
  if (emailEnabled && !skipEmail) {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    if (user?.email) {
      try {
        await sendNotificationEmail(user.email, title, title, body, link);
      } catch (err) {
        console.error("Notification email failed:", err);
      }
    }
  }

  // 3. Push notifications
  if (pushEnabled) {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    for (const sub of subs) {
      const success = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title, body, url: link, tag: type }
      );
      // Remove expired subscriptions
      if (!success) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
}
