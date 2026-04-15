"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getAuthSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function getAuthUser() {
  const user = await getAuthSession();
  if (!user.isApproved) {
    throw new Error("NotApproved");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = user as any;
  // Admin users are exempt from membership checks
  if (u.role === "admin") return user;
  // Check membership expiry (null = unlimited/legacy = no expiry)
  if (u.membershipEndDate && new Date(u.membershipEndDate) <= new Date()) {
    throw new Error("MembershipExpired");
  }
  return user;
}

export async function getAuthAdmin() {
  const user = await getAuthSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((user as any).role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
