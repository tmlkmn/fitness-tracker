/**
 * In-memory rate limiter for auth endpoints (login, password reset).
 * Uses a sliding window approach. For production scale, replace with Redis.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 3600_000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 600_000);

/**
 * Check and record an attempt. Throws if rate limited.
 * @param key - unique identifier (e.g. "login:ip:1.2.3.4" or "reset:email:a@b.com")
 * @param maxAttempts - max attempts in the window
 * @param windowMs - time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): void {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxAttempts) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);
    throw new Error(`RATE_LIMITED:${retryAfterSec}`);
  }

  entry.timestamps.push(now);
}

// Preset configs
export const RATE_LIMITS = {
  /** 5 login attempts per 15 minutes per IP */
  login: { maxAttempts: 5, windowMs: 15 * 60 * 1000 },
  /** 3 password reset requests per hour per email */
  passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },
} as const;
