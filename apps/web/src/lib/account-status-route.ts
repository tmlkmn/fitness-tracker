import { getAccessDenial, type AccountAccessFields } from "@/lib/account-access";

/**
 * Maps an account's status to the canonical (TR) page a blocked user must be
 * sent to. Shared by the proxy middleware (server-side gate) and the login
 * page (post-sign-in redirect) so the two can never disagree about where a
 * frozen / unapproved / lapsed user belongs.
 *
 * Pure + dependency-light (no server-only imports) so it runs in the Edge
 * middleware and the client login form alike.
 */

export interface StatusRouteFields extends AccountAccessFields {
  mustChangePassword?: boolean | null;
}

// Canonical TR path + its localized variants, for each blocked state.
export const STATUS_ROUTES = {
  changePassword: { tr: "/sifre-degistir", en: "/change-password" },
  frozen: { tr: "/dondurulmus", en: "/suspended" },
  pending: { tr: "/bekliyor", en: "/pending" },
  membershipExpired: { tr: "/uyelik-doldu", en: "/membership-expired" },
  trialExpired: { tr: "/deneme-bitti", en: "/trial-expired" },
} as const;

export type StatusRouteKey = keyof typeof STATUS_ROUTES;

const DENIAL_TO_KEY = {
  AccountFrozen: "frozen",
  NotApproved: "pending",
  MembershipExpired: "membershipExpired",
  TrialExpired: "trialExpired",
} as const;

/**
 * Returns the status-route key for a blocked account, or null when the account
 * is active and may use the app. Admins are always active.
 *
 * Priority mirrors the login flow: a temp-password user must reset before any
 * other gate applies.
 */
export function resolveStatusRouteKey(
  user: StatusRouteFields,
): StatusRouteKey | null {
  if (user.role === "admin") return null;
  if (user.mustChangePassword) return "changePassword";
  const denial = getAccessDenial(user);
  return denial ? DENIAL_TO_KEY[denial] : null;
}

/** Localized path (e.g. "/suspended" for en) for a status-route key. */
export function statusRoutePath(
  key: StatusRouteKey,
  locale: "tr" | "en",
): string {
  return STATUS_ROUTES[key][locale];
}
