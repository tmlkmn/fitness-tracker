"use server";

import { revalidatePath } from "next/cache";
import type { ConsentsDto } from "@fitmusc/shared/api/dto";
import { consentsSchema } from "@fitmusc/shared/api/schemas";
import { getAuthUserWithoutConsent } from "@/lib/auth-utils";
import { readConsents, writeConsents } from "@/lib/consent";
import { expireSessionCache } from "@/lib/session-cache";

/** The signed-in user's KVKK consents — also readable before they consent. */
export async function getMyConsents(): Promise<ConsentsDto> {
  const user = await getAuthUserWithoutConsent();
  return readConsents(user.id);
}

/**
 * Records or withdraws the user's consents (`true` = give now, `false` =
 * withdraw, omitted = unchanged). The data consent travels in the session
 * cookie cache, so that copy is dropped and the next request reads it fresh.
 */
export async function setMyConsents(change: { data?: boolean; ai?: boolean }): Promise<ConsentsDto> {
  const user = await getAuthUserWithoutConsent();
  const parsed = consentsSchema.safeParse(change);
  if (!parsed.success) throw new Error("InvalidInput");
  const result = await writeConsents(user.id, parsed.data);
  if (parsed.data.data !== undefined) await expireSessionCache();
  revalidatePath("/", "layout");
  return result;
}

/**
 * Drops the session cookie cache when it still reports a consent state the DB
 * no longer has (e.g. consent given in the mobile app a minute ago), so the
 * proxy stops sending the user to the consent page.
 */
export async function refreshConsentSession(): Promise<void> {
  await getAuthUserWithoutConsent();
  await expireSessionCache();
}
