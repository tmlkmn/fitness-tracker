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
      age: users.age,
      healthNotes: users.healthNotes,
      foodAllergens: users.foodAllergens,
      dailyRoutine: users.dailyRoutine,
      supplementSchedule: users.supplementSchedule,
      fitnessLevel: users.fitnessLevel,
      sportHistory: users.sportHistory,
      currentMedications: users.currentMedications,
      serviceType: users.serviceType,
      membershipType: users.membershipType,
      membershipStartDate: users.membershipStartDate,
      membershipEndDate: users.membershipEndDate,
      hasSeenOnboarding: users.hasSeenOnboarding,
    })
    .from(users)
    .where(eq(users.id, user.id));
  return rows[0] ?? { weight: null, targetWeight: null, height: null, age: null, healthNotes: null, foodAllergens: null, dailyRoutine: null, supplementSchedule: null, fitnessLevel: null, sportHistory: null, currentMedications: null, serviceType: "full", membershipType: null, membershipStartDate: null, membershipEndDate: null, hasSeenOnboarding: false };
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
  age?: number;
  healthNotes?: string;
  foodAllergens?: string;
  dailyRoutine?: { time: string; event: string }[];
  fitnessLevel?: string;
  sportHistory?: string;
  currentMedications?: string;
  serviceType?: string;
}) {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({
      height: data.height,
      weight: data.weight,
      targetWeight: data.targetWeight,
      age: data.age ?? undefined,
      healthNotes: data.healthNotes ?? null,
      foodAllergens: data.foodAllergens ?? null,
      dailyRoutine: data.dailyRoutine ?? undefined,
      fitnessLevel: data.fitnessLevel ?? undefined,
      sportHistory: data.sportHistory ?? undefined,
      currentMedications: data.currentMedications ?? undefined,
      serviceType: data.serviceType ?? undefined,
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

export async function updateUserProfile(data: {
  height?: number;
  weight?: string;
  targetWeight?: string;
  age?: number | null;
  healthNotes?: string;
  foodAllergens?: string;
  fitnessLevel?: string;
  sportHistory?: string;
  currentMedications?: string;
  serviceType?: string;
}) {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({
      height: data.height ?? undefined,
      weight: data.weight ?? undefined,
      targetWeight: data.targetWeight ?? undefined,
      age: data.age !== undefined ? data.age : undefined,
      healthNotes: data.healthNotes !== undefined ? data.healthNotes : undefined,
      foodAllergens: data.foodAllergens !== undefined ? data.foodAllergens : undefined,
      fitnessLevel: data.fitnessLevel !== undefined ? data.fitnessLevel : undefined,
      sportHistory: data.sportHistory !== undefined ? data.sportHistory : undefined,
      currentMedications: data.currentMedications !== undefined ? data.currentMedications : undefined,
      serviceType: data.serviceType ?? undefined,
    })
    .where(eq(users.id, user.id));
  revalidatePath("/");
  revalidatePath("/ayarlar");
  revalidatePath("/ilerleme");
}

export async function markOnboardingSeen() {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({ hasSeenOnboarding: true })
    .where(eq(users.id, user.id));
}
