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
    disableSignUp: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetEmail(user.email, url);
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
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
  },
  plugins: [
    admin({
      defaultRole: "user",
    }),
  ],
});
