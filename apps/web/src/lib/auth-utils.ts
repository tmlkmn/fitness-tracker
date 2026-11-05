"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getEntitlement, type BillingUserFields } from "@/lib/billing/entitlement";
import { getAccessDenial, type AccountAccessFields } from "@/lib/account-access";

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
  // Approval, freeze, legacy membership and billing gates all live in
  // getAccessDenial() so server actions and API routes can never drift apart.
  const denial = getAccessDenial(user as unknown as AccountAccessFields);
  if (denial) {
    throw new Error(denial);
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
