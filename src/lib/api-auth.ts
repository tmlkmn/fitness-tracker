import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getEntitlement, type BillingUserFields } from "@/lib/billing/entitlement";

/**
 * Unified auth wrapper for API route handlers (under `src/app/api/**`).
 *
 * Server actions throw via `getAuthUser()` / `getAuthAdmin()` from
 * `@/lib/auth-utils`. Route handlers want a typed response instead of a thrown
 * exception, so this module mirrors the same gating logic but returns a
 * `NextResponse` short-circuit when access is denied.
 *
 * Default policy: session + isApproved + active billing entitlement.
 * Pass options to relax individual gates (checkout, push unsubscribe,
 * invoice download for expired users, etc.).
 *
 * Intentional exclusions — routes that DO NOT use this wrapper:
 *   - /api/auth/*       better-auth manages its own session
 *   - /api/cron/*       gated by CRON_SECRET
 *   - /api/webhooks/*   gated by HMAC signature
 *   - /api/sentry-example-api  (will be removed in S3.1)
 *   - /api/push/diagnostic     intentionally accepts anon writes
 */

// Loose shape covering the better-auth session user plus our additional
// fields. Mirrors how auth-utils accesses these without forcing a stricter
// import-time type on every caller.
interface SessionUserShape extends BillingUserFields {
  id: string;
  email: string;
  name?: string | null;
  locale?: string | null;
  isApproved?: boolean | null;
}

export interface ApiAuthOptions {
  /** Require `users.isApproved = true`. Default true. */
  requireApproved?: boolean;
  /**
   * Require an active billing entitlement (active / trialing / past_due
   * grace / cancelled-but-paid-through / legacy unlimited). Default true.
   *
   * Set to false for:
   *   - Checkout routes (the whole point is to obtain entitlement)
   *   - Push subscribe/unsubscribe (notification delivery still needed)
   *   - Invoice PDF (users need receipts after expiry)
   *   - Account export (KVKK — must work post-expiry)
   */
  requireActiveBilling?: boolean;
}

export type ApiAuthResult =
  | { user: SessionUserShape; response: null }
  | { user: null; response: NextResponse };

function deny(error: string, status: number): ApiAuthResult {
  return { user: null, response: NextResponse.json({ error }, { status }) };
}

export async function requireApiUser(
  options: ApiAuthOptions = {},
): Promise<ApiAuthResult> {
  const { requireApproved = true, requireActiveBilling = true } = options;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return deny("Unauthorized", 401);
  }
  const user = session.user as unknown as SessionUserShape;

  // Admin shortcut — admins bypass approval + billing.
  if (user.role === "admin") {
    return { user, response: null };
  }

  if (requireApproved && !user.isApproved) {
    return deny("NotApproved", 403);
  }

  // Legacy membership expiry (admin-invited pre-billing users).
  if (
    user.membershipEndDate &&
    new Date(user.membershipEndDate) <= new Date()
  ) {
    return deny("MembershipExpired", 403);
  }

  if (requireActiveBilling) {
    const entitlement = getEntitlement(user);
    if (!entitlement.isActive && entitlement.status !== "legacy") {
      return deny("TrialExpired", 403);
    }
  }

  return { user, response: null };
}

export async function requireApiAdmin(): Promise<ApiAuthResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return deny("Unauthorized", 401);
  }
  const user = session.user as unknown as SessionUserShape;
  if (user.role !== "admin") {
    return deny("Forbidden", 403);
  }
  return { user, response: null };
}
