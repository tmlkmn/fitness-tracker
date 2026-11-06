import { expoTokenDeleteSchema, expoTokenSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { registerExpoPushToken, unregisterExpoPushToken } from "@/lib/expo-push";

/**
 * Registers this device for push. A token already registered by another
 * account moves to this one. Billing isn't required: lapsed accounts still
 * get account-critical pushes (expiry, billing).
 */
export const POST = apiRoute(
  { input: expoTokenSchema, auth: { requireActiveBilling: false } },
  ({ input, user }) => registerExpoPushToken(user.id, input.token, input.platform),
);

/** Unregisters this device — always allowed, so any account can opt out. */
export const DELETE = apiRoute(
  {
    input: expoTokenDeleteSchema,
    auth: { requireApproved: false, requireActiveBilling: false, allowFrozen: true, requireDataConsent: false },
  },
  ({ input, user }) => unregisterExpoPushToken(user.id, input.token),
);
