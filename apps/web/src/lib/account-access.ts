import { getEntitlement, type BillingUserFields } from "@/lib/billing/entitlement";

/**
 * Single source of truth for "may this account still act, and may the system
 * still act on it?".
 *
 * Previously each caller re-implemented the gate inline, which is how frozen
 * users kept slipping through: `getAuthUser()`, `requireApiUser()` and the
 * notification dispatcher all checked approval + billing but none of them
 * looked at `users.frozen_at`. A suspended account could therefore keep using
 * server actions and kept receiving reminder push/email indefinitely.
 *
 * Keep the billing math itself in `getEntitlement()` — that function stays
 * purely about subscriptions (account deletion relies on it to detect a live
 * subscription that still needs cancelling, so a frozen account must NOT read
 * as billing-inactive there).
 */

export type AccessDenial =
  | "AccountFrozen"
  | "NotApproved"
  | "MembershipExpired"
  | "TrialExpired";

export interface AccountAccessFields extends BillingUserFields {
  isApproved?: boolean | null;
  frozenAt?: Date | string | null;
}

export interface AccountAccessOptions {
  /** Require `users.isApproved = true`. Default true. */
  requireApproved?: boolean;
  /** Require an active billing entitlement. Default true. */
  requireActiveBilling?: boolean;
  /**
   * Let a frozen account through. Default false.
   *
   * Only for flows a suspended user must still complete: KVKK data export,
   * invoice/receipt download, and push unsubscribe (never block someone from
   * turning notifications off).
   */
  allowFrozen?: boolean;
}

/**
 * Returns the reason access is denied, or null when the account is active.
 * Admins bypass every gate.
 */
export function getAccessDenial(
  user: AccountAccessFields,
  options: AccountAccessOptions = {},
): AccessDenial | null {
  const {
    requireApproved = true,
    requireActiveBilling = true,
    allowFrozen = false,
  } = options;

  if (user.role === "admin") return null;

  // Freeze is an admin-imposed suspension, so it outranks the other gates: a
  // frozen account is inert even on routes that deliberately relax approval or
  // billing.
  if (!allowFrozen && user.frozenAt) return "AccountFrozen";

  if (requireApproved && !user.isApproved) return "NotApproved";

  // Legacy membership expiry (admin-invited users predating the billing
  // system). Checked regardless of `requireActiveBilling`.
  if (user.membershipEndDate && new Date(user.membershipEndDate) <= new Date()) {
    return "MembershipExpired";
  }

  if (requireActiveBilling) {
    const entitlement = getEntitlement(user);
    // A non-active "legacy" entitlement here just means an unlimited account —
    // the dated case was already handled above.
    if (!entitlement.isActive && entitlement.status !== "legacy") {
      return "TrialExpired";
    }
  }

  return null;
}

/**
 * True when the account is fully active. Used to decide whether the system may
 * initiate outbound traffic (reminders, shares) toward a user.
 */
export function isAccountActive(user: AccountAccessFields): boolean {
  return getAccessDenial(user) === null;
}
