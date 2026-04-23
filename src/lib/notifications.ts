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

function isInQuietHours(
  start: string | null | undefined,
  end: string | null | undefined,
  timezone: string | null | undefined
): boolean {
  if (!start || !end) return false;
  const tz = timezone ?? "Europe/Istanbul";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  const now = parseInt(hh) * 60 + parseInt(mm);
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false;
  return s < e ? now >= s && now < e : now >= s || now < e;
}

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
  const quiet = isInQuietHours(prefs?.quietHoursStart, prefs?.quietHoursEnd, prefs?.timezone);

  console.log(`[notification] userId=${userId} type=${type} prefs: inApp=${inAppEnabled} email=${emailEnabled} push=${pushEnabled} skipEmail=${skipEmail} quiet=${quiet}`);

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

  // 2. Email notification (suppressed during quiet hours)
  if (emailEnabled && !skipEmail && !quiet) {
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

  // 3. Push notifications (suppressed during quiet hours)
  if (pushEnabled && !quiet) {
    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (subs.length === 0) {
      console.warn(`[notification] No push subscriptions for user ${userId}`);
    }

    for (const sub of subs) {
      const success = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title, body, url: link, tag: type }
      );
      // Remove expired subscriptions
      if (!success) {
        console.warn(`[notification] Removing expired push subscription for user ${userId}`);
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
}
