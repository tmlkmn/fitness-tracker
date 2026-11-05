// Error contract of the v1 API: every non-2xx response has the body
// `{ error: ApiErrorCode, details? }`. Clients switch on `error`, never on
// the HTTP message text.

/** 403 codes from the account access gate — each maps to a status screen. */
export const ACCESS_DENIALS = [
  "AccountFrozen",
  "NotApproved",
  "MembershipExpired",
  "TrialExpired",
] as const;

export type AccessDenial = (typeof ACCESS_DENIALS)[number];

export type ApiErrorCode =
  | "Unauthorized" // 401 — no or expired session: sign the user out
  | AccessDenial // 403
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404 — also someone else's record or a malformed id
  | "INVALID_INPUT" // 400 — `details` holds the zod issues
  | "INVALID_JSON" // 400
  | "PAYLOAD_TOO_LARGE" // 413
  | "RATE_LIMITED" // 429 — see the Retry-After header
  | "COOLDOWN" // 429 — see the Retry-After header
  | "AI_UNAVAILABLE" // 503
  | "INTERNAL"; // 500

export interface ApiErrorBody {
  error: ApiErrorCode;
  details?: unknown;
}
