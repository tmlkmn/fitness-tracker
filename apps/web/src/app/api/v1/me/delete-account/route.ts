import { deleteAccountSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteMyAccount } from "@/actions/account";

/**
 * Irreversible: anonymizes the account and signs it out everywhere. The body
 * must repeat the account e-mail. Open to frozen / unapproved / lapsed
 * accounts too — KVKK and the App Store require deletion to always work.
 */
export const POST = apiRoute(
  {
    input: deleteAccountSchema,
    auth: { requireApproved: false, requireActiveBilling: false, allowFrozen: true, requireDataConsent: false },
    errors: { EmailMismatch: [400, "EMAIL_MISMATCH"] },
  },
  async ({ input }) => {
    await deleteMyAccount(input.confirmEmail);
  },
);
