"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";
import { getAuthAdmin } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendNotification } from "@/lib/notifications";

export async function inviteUser(email: string, name: string) {
  await getAuthAdmin();

  const tempPassword = crypto.randomUUID().slice(0, 12);
  const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await auth.api.createUser({
    headers: await headers(),
    body: {
      email,
      name,
      password: tempPassword,
      role: "user",
      data: {
        isApproved: false,
        mustChangePassword: true,
        inviteExpiresAt,
      },
    },
  });

  await sendInviteEmail(email, tempPassword);

  // Send welcome in-app notification (skip email since invite email already sent)
  const [newUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (newUser) {
    await sendNotification({
      userId: newUser.id,
      type: "user_invited",
      title: "FitTrack'e Hoş Geldiniz!",
      body: "Hesabınız oluşturuldu. Giriş yaparak başlayabilirsiniz.",
      link: "/",
      skipEmail: true,
    });
  }

  revalidatePath("/admin");
  return { success: true };
}

export type UserStatus = "Admin" | "Aktif" | "Bekliyor" | "Süresi Dolmuş";

export interface UserWithStatus {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
}

function getUserStatus(user: typeof users.$inferSelect): UserStatus {
  if (user.role === "admin") return "Admin";
  if (user.isApproved && !user.mustChangePassword) return "Aktif";
  if (user.inviteExpiresAt && new Date(user.inviteExpiresAt) <= new Date()) {
    return "Süresi Dolmuş";
  }
  return "Bekliyor";
}

export async function listAllUsers(): Promise<UserWithStatus[]> {
  await getAuthAdmin();

  const allUsers = await db
    .select()
    .from(users)
    .orderBy(users.createdAt);

  return allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: getUserStatus(u),
    createdAt: u.createdAt,
  }));
}

export async function resendInvite(userId: string) {
  await getAuthAdmin();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot resend invite to admin");

  const tempPassword = crypto.randomUUID().slice(0, 12);
  const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await auth.api.setUserPassword({
    headers: await headers(),
    body: { userId, newPassword: tempPassword },
  });

  await db
    .update(users)
    .set({ mustChangePassword: true, inviteExpiresAt, isApproved: false })
    .where(eq(users.id, userId));

  await sendInviteEmail(user.email, tempPassword);
  revalidatePath("/admin");
  return { success: true };
}

export async function removeUserAction(userId: string) {
  await getAuthAdmin();

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) throw new Error("User not found");
  if (user.role === "admin") throw new Error("Cannot remove admin user");

  await auth.api.removeUser({
    headers: await headers(),
    body: { userId },
  });

  revalidatePath("/admin");
  return { success: true };
}
