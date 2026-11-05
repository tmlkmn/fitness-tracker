import type { AIFeature } from "@/lib/ai";
import type { BillingTier } from "@/lib/billing/tier-config";
import { TIER_CONFIG } from "@/lib/billing/tier-config";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

// Minimal slice of the users row needed to resolve entitlement. Accepts the
// loosely-typed better-auth session user as well as a Drizzle row.
export interface BillingUserFields {
  role?: string | null;
  membershipType?: string | null;
  membershipEndDate?: Date | string | null;
  billingTier?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | string | null;
  nextBillingDate?: Date | string | null;
}

export interface Entitlement {
  // Tier used for AI limits / feature checks. Legacy + trial users resolve
  // to "pro"; only an explicit billingTier or admin yields "elite".
  tier: BillingTier;
  // "legacy" = admin-invited user predating the billing system.
  // "admin" = staff account, always active.
  status: SubscriptionStatus | "legacy" | "admin";
  isActive: boolean;
  // When access ends. null = no expiry (unlimited / admin / legacy lifetime).
  expiresAt: Date | null;
  // AI daily-limit overrides for the resolved tier (empty for Pro).
  limits: Partial<Record<AIFeature, number>>;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inFuture(date: Date | null): boolean {
  return date != null && date.getTime() > Date.now();
}

/**
 * Resolves a user's billing entitlement. Pure + synchronous so it can run in
 * server actions, route handlers and the AI rate limiter without a DB round
 * trip beyond the caller's own fetch.
 *
 * Branch order matters:
 *  1. admin            → always active, elite limits
 *  2. billingTier set  → real subscription, status-driven
 *  3. trialing         → 14-day trial, Pro limits
 *  4. legacy member    → admin-invited pre-billing user, Pro-equivalent
 */
export function getEntitlement(user: BillingUserFields): Entitlement {
  if (user.role === "admin") {
    return {
      tier: "elite",
      status: "admin",
      isActive: true,
      expiresAt: null,
      limits: TIER_CONFIG.elite.aiLimits,
    };
  }

  const tier: BillingTier = user.billingTier === "elite" ? "elite" : "pro";
  const limits = TIER_CONFIG[tier].aiLimits;
  const status = user.subscriptionStatus as SubscriptionStatus | null | undefined;

  // 2. Real subscription (Lemon Squeezy / iyzico / admin-assigned billing).
  if (user.billingTier === "pro" || user.billingTier === "elite") {
    const nextBilling = toDate(user.nextBillingDate);
    const trialEnds = toDate(user.trialEndsAt);

    switch (status) {
      case "active":
      case "past_due": // grace period — full access until cron expires it
        return { tier, status, isActive: true, expiresAt: nextBilling, limits };
      case "cancelled":
        // Access continues until the period the user already paid for ends.
        return {
          tier,
          status,
          isActive: inFuture(nextBilling),
          expiresAt: nextBilling,
          limits,
        };
      case "trialing":
        return {
          tier,
          status,
          isActive: inFuture(trialEnds),
          expiresAt: trialEnds,
          limits,
        };
      case "expired":
      default:
        return { tier, status: "expired", isActive: false, expiresAt: nextBilling, limits };
    }
  }

  // 3. Trial in progress, tier not yet chosen — Pro limits apply.
  if (status === "trialing") {
    const trialEnds = toDate(user.trialEndsAt);
    return {
      tier: "pro",
      status: "trialing",
      isActive: inFuture(trialEnds),
      expiresAt: trialEnds,
      limits,
    };
  }

  if (status === "expired") {
    return { tier: "pro", status: "expired", isActive: false, expiresAt: null, limits };
  }

  // 4. Legacy admin-invited user (membershipType or nothing). membershipEndDate
  // null = unlimited; otherwise access ends at that date.
  const membershipEnd = toDate(user.membershipEndDate);
  return {
    tier: "pro",
    status: "legacy",
    isActive: membershipEnd == null || inFuture(membershipEnd),
    expiresAt: membershipEnd,
    limits,
  };
}
