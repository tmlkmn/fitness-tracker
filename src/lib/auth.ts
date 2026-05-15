import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { db } from "@/db";
import {
  users as user,
  sessions as session,
  accounts as account,
  verifications as verification,
} from "@/db/schema";
import { sendResetEmail } from "@/lib/email";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // Public signup stays closed unless FEATURE_PUBLIC_SIGNUP is explicitly
    // enabled — preserving the invite-only model until billing goes live.
    disableSignUp: process.env.FEATURE_PUBLIC_SIGNUP !== "true",
    sendResetPassword: async ({ user, url }) => {
      const locale = (user as { locale?: string }).locale === "en" ? "en" : "tr";
      await sendResetEmail(user.email, url, locale);
    },
  },
  user: {
    additionalFields: {
      height: { type: "number", required: false },
      weight: { type: "string", required: false },
      targetWeight: { type: "string", required: false },
      healthNotes: { type: "string", required: false },
      isApproved: { type: "boolean", required: false, defaultValue: false },
      mustChangePassword: { type: "boolean", required: false, defaultValue: false },
      inviteExpiresAt: { type: "date", required: false },
      membershipType: { type: "string", required: false },
      membershipStartDate: { type: "date", required: false },
      membershipEndDate: { type: "date", required: false },
      membershipNotifiedAt: { type: "date", required: false },
      hasSeenOnboarding: { type: "boolean", required: false, defaultValue: false },
      locale: { type: "string", required: false, defaultValue: "tr" },
      frozenAt: { type: "date", required: false },
      subscriptionStatus: { type: "string", required: false },
      billingTier: { type: "string", required: false },
      billingInterval: { type: "string", required: false },
      trialEndsAt: { type: "date", required: false },
      nextBillingDate: { type: "date", required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  plugins: [
    admin({
      defaultRole: "user",
    }),
  ],
});
