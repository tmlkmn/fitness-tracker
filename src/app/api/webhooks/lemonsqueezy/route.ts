import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { db } from "@/db";
import { users, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recordWebhookEvent } from "@/lib/billing/webhook-events";
import { resolveVariant } from "@/lib/billing/lemonsqueezy";
import { notifyAdminsOfPaymentFailure } from "@/lib/billing/notify-admins";
import { sendNotification } from "@/lib/notifications";
import { getServerTranslator } from "@/lib/i18n-server";
import { normalizeLocale } from "@/lib/locale";
import type { SubscriptionStatus } from "@/lib/billing/entitlement";

// Lemon Squeezy webhook payload — only the fields we consume are typed.
interface LsPayload {
  meta?: { event_name?: string; custom_data?: { user_id?: string } };
  data?: {
    id?: string;
    attributes?: Record<string, unknown>;
  };
}

/**
 * Verifies the X-Signature HMAC against the current and (optionally) previous
 * webhook secret. Two slots allow rotating the secret without downtime.
 */
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secrets = [
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET_PREVIOUS,
  ].filter((s): s is string => Boolean(s));

  for (const secret of secrets) {
    const digest = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    if (
      digest.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
    ) {
      return true;
    }
  }
  return false;
}

// Maps a Lemon Squeezy subscription status to our internal enum.
function mapStatus(lsStatus: unknown): SubscriptionStatus {
  switch (lsStatus) {
    case "on_trial":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "paused":
    case "cancelled":
      return "cancelled";
    default:
      return "expired";
  }
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Lemon Squeezy money fields arrive in integer cents.
function centsToAmount(value: unknown): string | null {
  return typeof value === "number" ? (value / 100).toFixed(2) : null;
}

async function notifyBillingEvent(
  userId: string,
  locale: string | null,
  key: "subscriptionStarted" | "subscriptionCancelled" | "paymentFailed",
): Promise<void> {
  const loc = normalizeLocale(locale);
  const t = await getServerTranslator(loc, `triggerNotifications.${key}`);
  await sendNotification({
    userId,
    type: `billing_${key}`,
    title: t("title"),
    body: t("body"),
    link: loc === "en" ? "/en/settings/billing" : "/tr/ayarlar/odeme",
    skipEmail: key === "subscriptionStarted",
    // Payment failures and cancellations are critical — they must reach the
    // user by email regardless of preferences or quiet hours.
    forceEmail: key === "paymentFailed" || key === "subscriptionCancelled",
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LsPayload;
  try {
    payload = JSON.parse(rawBody) as LsPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? null;
  const data = payload.data;
  const attrs = data?.attributes;
  if (!eventName || !data?.id || !attrs) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  // Idempotency: updated_at changes per event, so a replay of the same event
  // collides while genuinely new events still process.
  const externalId = `${eventName}:${data.id}:${attrs.updated_at ?? ""}`;
  const isNew = await recordWebhookEvent(
    "lemonsqueezy",
    externalId,
    eventName,
    payload,
  );
  if (!isNew) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Resolve the target user — custom data is the source of truth; fall back to
  // an existing subscription mapping for events lacking custom data.
  const customUserId = payload.meta?.custom_data?.user_id;
  let user = customUserId
    ? (
        await db
          .select({ id: users.id, locale: users.locale })
          .from(users)
          .where(eq(users.id, customUserId))
      )[0]
    : undefined;

  if (eventName.startsWith("subscription_payment_")) {
    return handlePaymentEvent(eventName, data, attrs, user);
  }
  if (eventName.startsWith("subscription_")) {
    if (!user) {
      const bySub = await db
        .select({ id: users.id, locale: users.locale })
        .from(users)
        .where(eq(users.lemonSqueezySubscriptionId, data.id));
      user = bySub[0];
    }
    if (!user) {
      return NextResponse.json({ ok: true, ignored: "no user" });
    }
    return handleSubscriptionEvent(eventName, data.id, attrs, user);
  }

  return NextResponse.json({ ok: true, ignored: eventName });
}

async function handleSubscriptionEvent(
  eventName: string,
  subscriptionId: string,
  attrs: Record<string, unknown>,
  user: { id: string; locale: string | null },
) {
  const status = mapStatus(attrs.status);
  const variant = attrs.variant_id
    ? resolveVariant(String(attrs.variant_id))
    : null;

  await db
    .update(users)
    .set({
      billingProvider: "lemonsqueezy",
      lemonSqueezySubscriptionId: subscriptionId,
      lemonSqueezyCustomerId: attrs.customer_id
        ? String(attrs.customer_id)
        : undefined,
      subscriptionStatus: status,
      ...(variant
        ? { billingTier: variant.tier, billingInterval: variant.interval }
        : {}),
      trialEndsAt: toDate(attrs.trial_ends_at),
      nextBillingDate: toDate(attrs.renews_at),
      cancelledAt: status === "cancelled" ? new Date() : null,
      paymentFailedAt: status === "past_due" ? new Date() : null,
      isApproved: true,
    })
    .where(eq(users.id, user.id));

  if (eventName === "subscription_created") {
    await notifyBillingEvent(user.id, user.locale, "subscriptionStarted");
  } else if (eventName === "subscription_cancelled") {
    await notifyBillingEvent(user.id, user.locale, "subscriptionCancelled");
  }

  return NextResponse.json({ ok: true });
}

async function handlePaymentEvent(
  eventName: string,
  data: { id?: string },
  attrs: Record<string, unknown>,
  user: { id: string; locale: string | null } | undefined,
) {
  if (!user) {
    return NextResponse.json({ ok: true, ignored: "no user" });
  }

  if (eventName === "subscription_payment_success") {
    // Lemon Squeezy collects tax as Merchant of Record; tax/subtotal may be
    // absent on some events — kept nullable.
    const totalCents = typeof attrs.total === "number" ? attrs.total : 0;
    await db
      .insert(invoices)
      .values({
        userId: user.id,
        provider: "lemonsqueezy",
        providerRef: String(data.id),
        amount: (totalCents / 100).toFixed(2),
        subtotal: centsToAmount(attrs.subtotal),
        tax: centsToAmount(attrs.tax),
        currency: String(attrs.currency ?? "USD"),
        status: String(attrs.status ?? "paid"),
        pdfUrl:
          attrs.urls && typeof attrs.urls === "object"
            ? ((attrs.urls as Record<string, string>).invoice_url ?? null)
            : null,
        issuedAt: toDate(attrs.created_at) ?? new Date(),
      })
      .onConflictDoNothing({
        target: [invoices.provider, invoices.providerRef],
      });

    await db
      .update(users)
      .set({ paymentFailedAt: null })
      .where(eq(users.id, user.id));
  } else if (eventName === "subscription_payment_failed") {
    await db
      .update(users)
      .set({ subscriptionStatus: "past_due", paymentFailedAt: new Date() })
      .where(eq(users.id, user.id));
    await notifyBillingEvent(user.id, user.locale, "paymentFailed");
    await notifyAdminsOfPaymentFailure(user.id);
  }

  return NextResponse.json({ ok: true });
}
