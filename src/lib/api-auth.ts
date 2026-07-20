import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { BillingUserFields } from "@/lib/billing/entitlement";
import { getAccessDenial } from "@/lib/account-access";

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
  frozenAt?: Date | string | null;
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
  /**
   * Let a frozen (admin-suspended) account through. Default false.
   *
   * Only for flows a suspended user must still complete: KVKK account export,
   * invoice PDF download, and push unsubscribe.
   */
  allowFrozen?: boolean;
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return deny("Unauthorized", 401);
  }
  const user = session.user as unknown as SessionUserShape;

  // Approval, freeze, legacy membership and billing gates all live in
  // getAccessDenial() so route handlers and server actions stay in lockstep.
  const denial = getAccessDenial(user, options);
  if (denial) {
    return deny(denial, 403);
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
