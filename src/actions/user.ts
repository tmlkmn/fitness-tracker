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
      weekendRoutine: users.weekendRoutine,
      supplementSchedule: users.supplementSchedule,
      fitnessLevel: users.fitnessLevel,
      fitnessGoal: users.fitnessGoal,
      sportHistory: users.sportHistory,
      currentMedications: users.currentMedications,
      serviceType: users.serviceType,
      membershipType: users.membershipType,
      membershipStartDate: users.membershipStartDate,
      membershipEndDate: users.membershipEndDate,
      hasSeenOnboarding: users.hasSeenOnboarding,
      targetCalories: users.targetCalories,
      targetProteinG: users.targetProteinG,
      targetCarbsG: users.targetCarbsG,
      targetFatG: users.targetFatG,
      weightUnit: users.weightUnit,
      energyUnit: users.energyUnit,
    })
    .from(users)
    .where(eq(users.id, user.id));
  return rows[0] ?? { weight: null, targetWeight: null, height: null, age: null, healthNotes: null, foodAllergens: null, dailyRoutine: null, weekendRoutine: null, supplementSchedule: null, fitnessLevel: null, fitnessGoal: null, sportHistory: null, currentMedications: null, serviceType: "full", membershipType: null, membershipStartDate: null, membershipEndDate: null, hasSeenOnboarding: false, targetCalories: null, targetProteinG: null, targetCarbsG: null, targetFatG: null, weightUnit: "kg", energyUnit: "kcal" };
}

export async function updateUnitPreferences(data: {
  weightUnit: "kg" | "lb";
  energyUnit: "kcal" | "kj";
}) {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({
      weightUnit: data.weightUnit,
      energyUnit: data.energyUnit,
    })
    .where(eq(users.id, user.id));
  revalidatePath("/");
  revalidatePath("/ayarlar");
  revalidatePath("/ilerleme");
  revalidatePath("/gun", "layout");
}

export async function updateMacroTargets(data: {
  targetCalories: number | null;
  targetProteinG: string | null;
  targetCarbsG: string | null;
  targetFatG: string | null;
}) {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({
      targetCalories: data.targetCalories,
      targetProteinG: data.targetProteinG,
      targetCarbsG: data.targetCarbsG,
      targetFatG: data.targetFatG,
    })
    .where(eq(users.id, user.id));
  revalidatePath("/");
  revalidatePath("/ayarlar");
  revalidatePath("/gun", "layout");
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
  weekendRoutine?: { time: string; event: string }[];
  fitnessLevel?: string;
  fitnessGoal?: string;
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
      weekendRoutine: data.weekendRoutine ?? undefined,
      fitnessLevel: data.fitnessLevel ?? undefined,
      fitnessGoal: data.fitnessGoal ?? undefined,
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

export async function updateWeekendRoutine(items: { time: string; event: string }[]) {
  const user = await getAuthUser();
  await db
    .update(users)
    .set({ weekendRoutine: items })
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
  fitnessGoal?: string;
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
      fitnessGoal: data.fitnessGoal !== undefined ? data.fitnessGoal : undefined,
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
