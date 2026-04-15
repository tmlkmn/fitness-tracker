"use server";

import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getAuthSession } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function forceChangePassword(newPassword: string) {
  const user = await getAuthSession();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(user as any).mustChangePassword) {
    throw new Error("Password change not required");
  }

  if (newPassword.length < 8) {
    throw new Error("Şifre en az 8 karakter olmalıdır");
  }

  const hashed = await hashPassword(newPassword);
  await db
    .update(accounts)
    .set({ password: hashed })
    .where(
      and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential"))
    );

  await db
    .update(users)
    .set({ mustChangePassword: false, isApproved: true })
    .where(eq(users.id, user.id));

  revalidatePath("/");
  return { success: true };
}

export async function requestPasswordReset(email: string) {
  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/sifre-sifirla" },
  });

  return { success: true };
}
