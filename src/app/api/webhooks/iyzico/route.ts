import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "node:crypto";
import { db } from "@/db";
import { users, invoices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { recordWebhookEvent } from "@/lib/billing/webhook-events";
import { notifyAdminsOfPaymentFailure } from "@/lib/billing/notify-admins";
import { splitVatInclusive } from "@/lib/billing/currency";
import { sendNotification } from "@/lib/notifications";
import { getServerTranslator } from "@/lib/i18n-server";
import { normalizeLocale } from "@/lib/locale";
import type { SubscriptionStatus } from "@/lib/billing/entitlement";

// iyzico subscription webhook payload — only consumed fields are typed.
interface IyzicoWebhook {
  iyziEventType?: string;
  iyziReferenceCode?: string;
  subscriptionReferenceCode?: string;
  customerReferenceCode?: string;
  orderReferenceCode?: string;
  iyziEventTime?: string | number;
  [key: string]: unknown;
}

/**
 * Verifies the iyzico webhook signature against the current + previous
 * secret. NOTE: iyzico's exact webhook signing scheme must be confirmed
 * against the sandbox during Sprint 0 — this uses an HMAC-SHA256 of the raw
 * body, the most common scheme.
 */
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secrets = [
    process.env.IYZICO_WEBHOOK_SECRET,
    process.env.IYZICO_WEBHOOK_SECRET_PREVIOUS,
  ].filter((s): s is string => Boolean(s));

  for (const secret of secrets) {
    const digest = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");
    if (
      digest.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
    ) {
      return true;
    }
  }
  return false;
}

// Maps an iyzico subscription event to our internal status.
function statusForEvent(eventType: string): SubscriptionStatus | null {
  const e = eventType.toUpperCase();
  if (e.includes("ORDER") && e.includes("SUCCESS")) return "active";
  if (e.includes("UNPAID") || e.includes("FAIL")) return "past_due";
  if (e.includes("CANCEL")) return "cancelled";
  if (e.includes("EXPIRE")) return "expired";
  return null;
}

// Records an invoice for a successful recurring charge. iyzico TRY amounts are
// quoted VAT-inclusive (KDV), so the total is split for the receipt tax line.
async function recordIyzicoInvoice(
  userId: string,
  externalId: string,
  payload: IyzicoWebhook,
): Promise<void> {
  const total = payload.price ?? payload.paidPrice;
  if (typeof total !== "number" && typeof total !== "string") return;

  const totalNum =
    typeof total === "number" ? total : Number.parseFloat(total);
  const vat = Number.isFinite(totalNum) ? splitVatInclusive(totalNum) : null;

  await db
    .insert(invoices)
    .values({
      userId,
      provider: "iyzico",
      providerRef: externalId,
      amount: String(total),
      subtotal: vat?.subtotal ?? null,
      tax: vat?.tax ?? null,
      currency: "TRY",
      status: "paid",
      issuedAt: new Date(),
    })
    .onConflictDoNothing({
      target: [invoices.provider, invoices.providerRef],
    });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (
    !verifySignature(rawBody, request.headers.get("x-iyz-signature-v3"))
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: IyzicoWebhook;
  try {
    payload = JSON.parse(rawBody) as IyzicoWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.iyziEventType ?? "";
  const subscriptionRef = payload.subscriptionReferenceCode;
  if (!eventType || !subscriptionRef) {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const externalId = `${eventType}:${subscriptionRef}:${
    payload.iyziReferenceCode ?? payload.iyziEventTime ?? ""
  }`;
  const isNew = await recordWebhookEvent(
    "iyzico",
    externalId,
    eventType,
    payload,
  );
  if (!isNew) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const [user] = await db
    .select({ id: users.id, locale: users.locale })
    .from(users)
    .where(eq(users.iyzicoSubscriptionRef, subscriptionRef));
  if (!user) {
    return NextResponse.json({ ok: true, ignored: "no user" });
  }

  const status = statusForEvent(eventType);
  if (!status) {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  await db
    .update(users)
    .set({
      subscriptionStatus: status,
      paymentFailedAt: status === "past_due" ? new Date() : null,
      cancelledAt: status === "cancelled" ? new Date() : null,
    })
    .where(eq(users.id, user.id));

  if (status === "active") {
    await recordIyzicoInvoice(user.id, externalId, payload);
  } else if (status === "past_due") {
    const loc = normalizeLocale(user.locale);
    const t = await getServerTranslator(
      loc,
      "triggerNotifications.paymentFailed",
    );
    await sendNotification({
      userId: user.id,
      type: "billing_paymentFailed",
      title: t("title"),
      body: t("body"),
      link: loc === "en" ? "/en/settings/billing" : "/tr/ayarlar/odeme",
      forceEmail: true,
    });
    await notifyAdminsOfPaymentFailure(user.id);
  }

  return NextResponse.json({ ok: true });
}
