import { createHash } from "node:crypto";

/**
 * PII-redaction helpers for server logs.
 *
 * In dev (or when DEBUG_NOTIFICATIONS=1) the original value is returned for
 * easier debugging. In production we emit a short SHA-256 prefix instead so
 * Vercel logs don't store raw user identifiers or push endpoints.
 *
 * Hash prefixes are stable per identifier — you can still correlate log
 * lines for the same user across requests, you just can't reverse the hash
 * back to a user.
 */

const isVerbose =
  process.env.NODE_ENV !== "production" ||
  process.env.DEBUG_NOTIFICATIONS === "1";

/**
 * Returns a short, stable, non-reversible token for the input string. Use for
 * user IDs, session IDs, push-subscription IDs, etc.
 */
export function redactId(value: string | null | undefined, length = 8): string {
  if (!value) return "(none)";
  if (isVerbose) return value;
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

/**
 * Returns the push service hostname (fcm.googleapis.com, web.push.apple.com,
 * etc.) without the per-device endpoint token. The hostname is useful for
 * platform-level diagnostics ("Apple push is down") without exposing identifiers.
 */
export function redactEndpoint(endpoint: string | null | undefined): string {
  if (!endpoint) return "(none)";
  try {
    const host = new URL(endpoint).host;
    if (isVerbose) return `${host}/${endpoint.slice(-12)}`;
    return host;
  } catch {
    return "(invalid)";
  }
}
