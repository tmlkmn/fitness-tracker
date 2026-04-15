"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";

export async function getUserProfile() {
  const user = await getAuthUser();
  const rows = await db
    .select({
      weight: users.weight,
      targetWeight: users.targetWeight,
      height: users.height,
      healthNotes: users.healthNotes,
      membershipType: users.membershipType,
      membershipStartDate: users.membershipStartDate,
      membershipEndDate: users.membershipEndDate,
    })
    .from(users)
    .where(eq(users.id, user.id));
  return rows[0] ?? { weight: null, targetWeight: null, height: null, healthNotes: null, membershipType: null, membershipStartDate: null, membershipEndDate: null };
}

export async function updateUserWeightTargets(data: {
  weight?: string;
  targetWeight?: string;
}) {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({
      weight: data.weight ?? null,
      targetWeight: data.targetWeight ?? null,
    })
    .where(eq(users.id, user.id));
  revalidatePath("/ilerleme");
}

export async function updateUserOnboarding(data: {
  height: number;
  weight: string;
  targetWeight: string;
  healthNotes?: string;
}) {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({
      height: data.height,
      weight: data.weight,
      targetWeight: data.targetWeight,
      healthNotes: data.healthNotes ?? null,
    })
    .where(eq(users.id, user.id));
  revalidatePath("/");
  revalidatePath("/ayarlar");
  revalidatePath("/ilerleme");
}
