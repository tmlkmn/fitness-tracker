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
import { normalizeLocale } from "@/lib/locale";
import { redactId } from "@/lib/log-redact";
import { getAccessDenial } from "@/lib/account-access";

/**
 * Notification types that must still reach a suspended / lapsed account: they
 * either explain why access stopped or are the path back to an active
 * membership. Everything else (reminders, shares, engagement nudges) is
 * withheld until the account is active again.
 *
 * `billing_*` is matched by prefix — see `notifyBillingEvent` in the Lemon
 * Squeezy and iyzico webhooks.
 */
const ACCOUNT_CRITICAL_TYPES = new Set([
  "user_invited",
  "membership_extended",
  "membership_expiring",
  "membership_expired",
  "trial_ending",
  "trial_ended",
  // Admin-initiated: staff deliberately reaching out to this specific user.
  "admin_nudge",
  // Reply to a support ticket the user themselves opened.
  "feedback_response",
]);

function isAccountCritical(type: string): boolean {
  return type.startsWith("billing_") || ACCOUNT_CRITICAL_TYPES.has(type);
}

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
  // Critical transactional mail (payment failures, cancellations): bypasses
  // the user's email preference and quiet hours so the message always lands.
  forceEmail?: boolean;
}): Promise<void> {
  const { userId, type, title, body, link, metadata, skipEmail, forceEmail } =
    params;

  // Only active accounts receive system-initiated traffic. A frozen, unapproved
  // or lapsed user keeps getting account-critical mail (expiry, billing,
  // invites) but no reminders, shares or other engagement pushes.
  const [recipient] = await db
    .select({
      email: users.email,
      locale: users.locale,
      role: users.role,
      isApproved: users.isApproved,
      frozenAt: users.frozenAt,
      membershipType: users.membershipType,
      membershipEndDate: users.membershipEndDate,
      billingTier: users.billingTier,
      subscriptionStatus: users.subscriptionStatus,
      trialEndsAt: users.trialEndsAt,
      nextBillingDate: users.nextBillingDate,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!recipient) {
    console.warn(`[notification] Unknown recipient user=${redactId(userId)} type=${type}`);
    return;
  }

  const denial = getAccessDenial(recipient);
  if (denial && !isAccountCritical(type)) {
    console.log(
      `[notification] suppressed user=${redactId(userId)} type=${type} reason=${denial}`
    );
    return;
  }

  // Get user preferences (defaults: all enabled)
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  const inAppEnabled = prefs?.inAppEnabled ?? true;
  const emailEnabled = prefs?.emailEnabled ?? true;
  const pushEnabled = prefs?.pushEnabled ?? true;
  const quiet = isInQuietHours(prefs?.quietHoursStart, prefs?.quietHoursEnd, prefs?.timezone);

  console.log(`[notification] user=${redactId(userId)} type=${type} prefs: inApp=${inAppEnabled} email=${emailEnabled} push=${pushEnabled} skipEmail=${skipEmail} forceEmail=${forceEmail} quiet=${quiet}`);

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

  // 2. Email notification. Normally gated by the user's email preference and
  // quiet hours; forceEmail overrides both for critical transactional mail.
  if (!skipEmail && (forceEmail || (emailEnabled && !quiet))) {
    if (recipient.email) {
      try {
        await sendNotificationEmail(
          recipient.email,
          title,
          title,
          body,
          link,
          normalizeLocale(recipient.locale),
        );
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
      console.warn(`[notification] No push subscriptions for user=${redactId(userId)}`);
    }

    for (const sub of subs) {
      const success = await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        { title, body, url: link, tag: type }
      );
      // Remove expired subscriptions
      if (!success) {
        console.warn(`[notification] Removing expired push subscription for user=${redactId(userId)}`);
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
}
