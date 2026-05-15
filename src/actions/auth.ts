"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { TRIAL_DAYS } from "@/lib/billing/tier-config";
import { normalizeLocale, type Locale } from "@/lib/locale";
import { isPublicSignupEnabled } from "@/lib/feature-flags";

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  locale: Locale;
}

/**
 * Public self-serve signup with a 14-day trial. Gated by FEATURE_PUBLIC_SIGNUP
 * — while disabled the app remains invite-only. The trial grants full Pro-tier
 * access; no card is required up front.
 */
export async function signUpWithTrial(
  input: SignUpInput,
): Promise<{ success: true }> {
  if (!isPublicSignupEnabled()) {
    throw new Error("SignupDisabled");
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email || !email.includes("@") || !name || input.password.length < 8) {
    throw new Error("InvalidInput");
  }
  const locale = normalizeLocale(input.locale);

  await auth.api.signUpEmail({
    headers: await headers(),
    body: { email, name, password: input.password },
  });

  // Promote the freshly created account into an active trial. A row created
  // by any other path stays unapproved and cannot reach the app.
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await db
    .update(users)
    .set({
      isApproved: true,
      subscriptionStatus: "trialing",
      trialEndsAt,
      locale,
    })
    .where(eq(users.email, email));

  return { success: true };
}
