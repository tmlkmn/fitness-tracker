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
      dailyRoutine: users.dailyRoutine,
      supplementSchedule: users.supplementSchedule,
      membershipType: users.membershipType,
      membershipStartDate: users.membershipStartDate,
      membershipEndDate: users.membershipEndDate,
    })
    .from(users)
    .where(eq(users.id, user.id));
  return rows[0] ?? { weight: null, targetWeight: null, height: null, healthNotes: null, dailyRoutine: null, supplementSchedule: null, membershipType: null, membershipStartDate: null, membershipEndDate: null };
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

export async function updateDailyRoutine(items: { time: string; event: string }[]) {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({ dailyRoutine: items })
    .where(eq(users.id, user.id));
  revalidatePath("/ayarlar");
}

export async function updateSupplementSchedule(items: { period: string; supplements: string }[]) {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({ supplementSchedule: items })
    .where(eq(users.id, user.id));
  revalidatePath("/ayarlar");
}
