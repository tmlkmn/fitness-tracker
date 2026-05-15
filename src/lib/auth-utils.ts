"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getEntitlement, type BillingUserFields } from "@/lib/billing/entitlement";

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
  // Legacy membership expiry (admin-invited users predating the billing system).
  if (u.membershipEndDate && new Date(u.membershipEndDate) <= new Date()) {
    throw new Error("MembershipExpired");
  }
  // Billing / trial expiry. Legacy users are already handled above, so a
  // non-active "legacy" entitlement here just means an unlimited account.
  const entitlement = getEntitlement(u as BillingUserFields);
  if (!entitlement.isActive && entitlement.status !== "legacy") {
    throw new Error("TrialExpired");
  }
  return user;
}

export async function getAuthUserWithEntitlement() {
  const user = await getAuthUser();
  return { user, entitlement: getEntitlement(user as BillingUserFields) };
}

export async function getAuthAdmin() {
  const user = await getAuthSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((user as any).role !== "admin") {
    throw new Error("Forbidden");
  }
  return user;
}
