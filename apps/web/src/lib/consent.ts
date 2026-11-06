import { eq } from "drizzle-orm";
import type { ConsentsDto } from "@fitmusc/shared/api/dto";
import { hasAiConsent, hasDataConsent } from "@fitmusc/shared/consent";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * KVKK consents (see `@fitmusc/shared/consent`). The data consent gates the
 * whole app (getAuthUser / requireApiUser / proxy); the AI consent gates every
 * call that sends user data to Anthropic (checkRateLimit in `src/lib/ai.ts`).
 */

interface ConsentSessionUser {
  id: string;
  role?: string | null;
  dataConsentAt?: Date | string | null;
}

/**
 * True when the user may use the app. Admins pass. The session copy is read
 * first; when it says "missing" the DB decides, because the 5-minute session
 * cookie cache still carries the old value right after the user consents.
 */
export async function userHasDataConsent(user: ConsentSessionUser): Promise<boolean> {
  if (user.role === "admin") return true;
  if (hasDataConsent(user.dataConsentAt)) return true;
  const [row] = await db
    .select({ at: users.dataConsentAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  return hasDataConsent(row?.at);
}

/** Throws `AI_CONSENT_REQUIRED` unless the user allowed sending their data to the AI provider. */
export async function assertAiConsent(userId: string): Promise<void> {
  const [row] = await db
    .select({ at: users.aiConsentAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!hasAiConsent(row?.at)) throw new Error("AI_CONSENT_REQUIRED");
}

export async function readConsents(userId: string): Promise<ConsentsDto> {
  const [row] = await db
    .select({ dataConsentAt: users.dataConsentAt, aiConsentAt: users.aiConsentAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return {
    dataConsentAt: row?.dataConsentAt?.toISOString() ?? null,
    aiConsentAt: row?.aiConsentAt?.toISOString() ?? null,
  };
}

/**
 * Records (true) or withdraws (false) each consent sent; keys left undefined
 * stay as they are. Giving a consent again refreshes its timestamp, so the
 * record always shows the latest text the user agreed to.
 */
export async function writeConsents(
  userId: string,
  change: { data?: boolean; ai?: boolean },
): Promise<ConsentsDto> {
  const now = new Date();
  const set: { dataConsentAt?: Date | null; aiConsentAt?: Date | null } = {};
  if (change.data !== undefined) set.dataConsentAt = change.data ? now : null;
  if (change.ai !== undefined) set.aiConsentAt = change.ai ? now : null;
  if (Object.keys(set).length > 0) {
    await db.update(users).set(set).where(eq(users.id, userId));
  }
  return readConsents(userId);
}

