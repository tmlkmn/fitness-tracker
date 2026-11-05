"use server";

import { db } from "@/db";
import { users, invoices } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/lib/auth-utils";
import { getUserLocale } from "@/lib/locale";
import {
  createCheckoutUrl,
  cancelLsSubscription,
  resumeLsSubscription,
  getCustomerPortalUrl,
} from "@/lib/billing/lemonsqueezy";
import { cancelIyzicoSubscription } from "@/lib/billing/iyzico";
import {
  isBillingTier,
  isBillingInterval,
  type BillingTier,
  type BillingInterval,
} from "@/lib/billing/tier-config";
import { getEntitlement } from "@/lib/billing/entitlement";
import { logAudit } from "@/lib/audit";

// Reads the full billing row for the signed-in user.
async function loadBillingRow(userId: string) {
  const [row] = await db
    .select({
      role: users.role,
      membershipType: users.membershipType,
      membershipEndDate: users.membershipEndDate,
      billingTier: users.billingTier,
      billingInterval: users.billingInterval,
      billingProvider: users.billingProvider,
      subscriptionStatus: users.subscriptionStatus,
      trialEndsAt: users.trialEndsAt,
      nextBillingDate: users.nextBillingDate,
      paymentFailedAt: users.paymentFailedAt,
      cancelledAt: users.cancelledAt,
      lemonSqueezySubscriptionId: users.lemonSqueezySubscriptionId,
      iyzicoSubscriptionRef: users.iyzicoSubscriptionRef,
    })
    .from(users)
    .where(eq(users.id, userId));
  return row;
}

export interface BillingSnapshot {
  tier: BillingTier;
  status: string;
  isActive: boolean;
  provider: string | null;
  interval: BillingInterval | null;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
  paymentFailedAt: Date | null;
  cancelledAt: Date | null;
}

/** Current billing state for the settings billing card / trial banner. */
export async function getMyBilling(): Promise<BillingSnapshot> {
  const user = await getAuthSession();
  const row = await loadBillingRow(user.id);
  const entitlement = getEntitlement(row ?? {});
  return {
    tier: entitlement.tier,
    status: entitlement.status,
    isActive: entitlement.isActive,
    provider: row?.billingProvider ?? null,
    interval: (row?.billingInterval as BillingInterval | null) ?? null,
    trialEndsAt: row?.trialEndsAt ?? null,
    nextBillingDate: row?.nextBillingDate ?? null,
    paymentFailedAt: row?.paymentFailedAt ?? null,
    cancelledAt: row?.cancelledAt ?? null,
  };
}

/**
 * Starts a Lemon Squeezy checkout and returns the hosted-page URL. iyzico
 * checkouts go through the dedicated /api/checkout/iyzico form flow instead,
 * so the gateway choice is made by the UI (server-resolved) before this runs.
 */
export async function createCheckoutSession(
  tier: BillingTier,
  interval: BillingInterval,
): Promise<{ url: string }> {
  const user = await getAuthSession();
  if (!isBillingTier(tier) || !isBillingInterval(interval)) {
    throw new Error("Invalid plan");
  }

  const url = await createCheckoutUrl({
    userId: user.id,
    email: user.email,
    tier,
    interval,
    locale: getUserLocale(user),
  });
  return { url };
}

export async function cancelMySubscription(): Promise<{ success: true }> {
  const user = await getAuthSession();
  const row = await loadBillingRow(user.id);

  if (row?.billingProvider === "lemonsqueezy" && row.lemonSqueezySubscriptionId) {
    await cancelLsSubscription(row.lemonSqueezySubscriptionId);
  } else if (row?.billingProvider === "iyzico" && row.iyzicoSubscriptionRef) {
    await cancelIyzicoSubscription(row.iyzicoSubscriptionRef);
  } else {
    throw new Error("NoSubscription");
  }

  // Webhook applies the authoritative state change; this is just the trigger.
  logAudit({
    userId: user.id,
    action: "billing.cancel",
    entityType: "subscription",
    entityId: user.id,
  }).catch(() => {});
  revalidatePath("/");
  return { success: true };
}

export async function resumeMySubscription(): Promise<{ success: true }> {
  const user = await getAuthSession();
  const row = await loadBillingRow(user.id);

  if (row?.billingProvider === "lemonsqueezy" && row.lemonSqueezySubscriptionId) {
    await resumeLsSubscription(row.lemonSqueezySubscriptionId);
  } else {
    throw new Error("NoSubscription");
  }

  logAudit({
    userId: user.id,
    action: "billing.resume",
    entityType: "subscription",
    entityId: user.id,
  }).catch(() => {});
  revalidatePath("/");
  return { success: true };
}

/** Lemon Squeezy hosted portal URL for PCI-sensitive actions (card update). */
export async function openCustomerPortal(): Promise<{ url: string }> {
  const user = await getAuthSession();
  const row = await loadBillingRow(user.id);
  if (row?.billingProvider !== "lemonsqueezy" || !row.lemonSqueezySubscriptionId) {
    throw new Error("NoSubscription");
  }
  const url = await getCustomerPortalUrl(row.lemonSqueezySubscriptionId);
  if (!url) throw new Error("PortalUnavailable");
  return { url };
}

export interface InvoiceRow {
  id: number;
  provider: string;
  amount: string;
  currency: string;
  status: string;
  pdfUrl: string | null;
  issuedAt: Date;
}

export async function getMyInvoices(): Promise<InvoiceRow[]> {
  const user = await getAuthSession();
  return db
    .select({
      id: invoices.id,
      provider: invoices.provider,
      amount: invoices.amount,
      currency: invoices.currency,
      status: invoices.status,
      pdfUrl: invoices.pdfUrl,
      issuedAt: invoices.issuedAt,
    })
    .from(invoices)
    .where(eq(invoices.userId, user.id))
    .orderBy(desc(invoices.issuedAt));
}
