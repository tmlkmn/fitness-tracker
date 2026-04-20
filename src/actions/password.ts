"use server";

import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getAuthSession } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { computeMembershipEndDate } from "@/actions/admin";
import { validatePasswordStrength } from "@/lib/password-validation";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function forceChangePassword(newPassword: string) {
  const user = await getAuthSession();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(user as any).mustChangePassword) {
    throw new Error("Password change not required");
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    throw new Error(strength.error!);
  }

  const hashed = await hashPassword(newPassword);
  await db
    .update(accounts)
    .set({ password: hashed })
    .where(
      and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential"))
    );

  // Fetch membership info to compute dates
  const [dbUser] = await db
    .select({
      membershipType: users.membershipType,
      membershipEndDate: users.membershipEndDate,
    })
    .from(users)
    .where(eq(users.id, user.id));

  const now = new Date();
  const updateData: Record<string, unknown> = {
    mustChangePassword: false,
    isApproved: true,
    membershipStartDate: now,
  };

  if (dbUser?.membershipType && dbUser.membershipType !== "unlimited") {
    const endDate = await computeMembershipEndDate(
      dbUser.membershipType,
      now,
      dbUser.membershipEndDate
    );
    if (endDate) {
      updateData.membershipEndDate = endDate;
    }
  }

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, user.id));

  revalidatePath("/");
  return { success: true };
}

export async function requestPasswordReset(email: string) {
  // Rate limit: 3 requests per hour per email
  try {
    checkRateLimit(`reset:${email.toLowerCase()}`, RATE_LIMITS.passwordReset.maxAttempts, RATE_LIMITS.passwordReset.windowMs);
  } catch {
    return { success: false, error: "TooManyRequests" };
  }

  // Always return success to prevent user enumeration
  try {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: "/sifre-sifirla" },
      });
    }
  } catch {
    // Swallow errors — don't reveal whether email exists
  }

  return { success: true, error: null };
}
