import type { ConsentsDto } from "@fitmusc/shared/api/dto";
import { consentsSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { readConsents, writeConsents } from "@/lib/consent";

// Reachable before the KVKK data consent — this is where it is given.
const auth = { requireDataConsent: false };

/** The user's KVKK consents (ISO timestamps, null = not given). */
export const GET = apiRoute(
  { auth },
  ({ user }): Promise<ConsentsDto> => readConsents(user.id),
);

/**
 * Gives (`true`) or withdraws (`false`) the data and/or AI consent. The app
 * refreshes its session afterwards: the session cookie cache carries the
 * data consent for up to 5 minutes, but the server re-checks the DB before
 * it ever denies on a missing consent.
 */
export const PUT = apiRoute(
  { input: consentsSchema, auth },
  ({ user, input }): Promise<ConsentsDto> => writeConsents(user.id, input),
);
