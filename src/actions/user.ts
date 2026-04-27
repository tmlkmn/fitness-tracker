"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  computeDefaultTargets,
  resolveTargets,
  type MacroTargets,
} from "@/lib/macro-targets";

const TARGET_PROFILE_FIELDS = {
  weight: users.weight,
  targetWeight: users.targetWeight,
  height: users.height,
  age: users.age,
  gender: users.gender,
  dailyActivityLevel: users.dailyActivityLevel,
  fitnessGoal: users.fitnessGoal,
  serviceType: users.serviceType,
  targetCalories: users.targetCalories,
  targetProteinG: users.targetProteinG,
  targetCarbsG: users.targetCarbsG,
  targetFatG: users.targetFatG,
} as const;

export async function getResolvedMacroTargets(): Promise<MacroTargets | null> {
  const user = await getAuthUser();
  const [profile] = await db
    .select(TARGET_PROFILE_FIELDS)
    .from(users)
    .where(eq(users.id, user.id));
  if (!profile) return null;
  return resolveTargets(profile, user.id);
}

export async function getDefaultMacroTargets(): Promise<MacroTargets | null> {
  const user = await getAuthUser();
  const [profile] = await db
    .select(TARGET_PROFILE_FIELDS)
    .from(users)
    .where(eq(users.id, user.id));
  if (!profile) return null;
  return computeDefaultTargets(profile, user.id);
}

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
      gender: users.gender,
      dailyActivityLevel: users.dailyActivityLevel,
      hasEatingDisorderHistory: users.hasEatingDisorderHistory,
      isPregnantOrBreastfeeding: users.isPregnantOrBreastfeeding,
      hasDiabetes: users.hasDiabetes,
      hasThyroidCondition: users.hasThyroidCondition,
    })
    .from(users)
    .where(eq(users.id, user.id));
  return rows[0] ?? { weight: null, targetWeight: null, height: null, age: null, healthNotes: null, foodAllergens: null, dailyRoutine: null, weekendRoutine: null, supplementSchedule: null, fitnessLevel: null, fitnessGoal: null, sportHistory: null, currentMedications: null, serviceType: "full", membershipType: null, membershipStartDate: null, membershipEndDate: null, hasSeenOnboarding: false, targetCalories: null, targetProteinG: null, targetCarbsG: null, targetFatG: null, weightUnit: "kg", energyUnit: "kcal", gender: null, dailyActivityLevel: null, hasEatingDisorderHistory: false, isPregnantOrBreastfeeding: false, hasDiabetes: false, hasThyroidCondition: false };
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

// ─── Health profile (Mifflin-St Jeor + IF safety inputs) ───────────────────

const GENDER_VALUES = new Set(["male", "female", "prefer_not_to_say"]);
const ACTIVITY_VALUES = new Set(["sedentary", "light", "moderate", "very_active"]);

export interface UpdateHealthProfileInput {
  gender: "male" | "female" | "prefer_not_to_say";
  dailyActivityLevel: "sedentary" | "light" | "moderate" | "very_active";
  hasEatingDisorderHistory: boolean;
  isPregnantOrBreastfeeding: boolean;
  hasDiabetes: boolean;
  hasThyroidCondition: boolean;
}

export async function updateHealthProfile(data: UpdateHealthProfileInput) {
  const user = await getAuthUser();

  // Validate enums explicitly — these come from a client form so they could
  // be tampered with even though the UI only renders allowed values.
  if (!GENDER_VALUES.has(data.gender)) {
    throw new Error("Invalid gender value");
  }
  if (!ACTIVITY_VALUES.has(data.dailyActivityLevel)) {
    throw new Error("Invalid dailyActivityLevel value");
  }

  await db
    .update(users)
    .set({
      gender: data.gender,
      dailyActivityLevel: data.dailyActivityLevel,
      hasEatingDisorderHistory: Boolean(data.hasEatingDisorderHistory),
      isPregnantOrBreastfeeding: Boolean(data.isPregnantOrBreastfeeding),
      hasDiabetes: Boolean(data.hasDiabetes),
      hasThyroidCondition: Boolean(data.hasThyroidCondition),
    })
    .where(eq(users.id, user.id));

  // Macro targets depend on gender + activity + LBM, so resolved targets and
  // any AI prompts that use them must refresh.
  revalidatePath("/");
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/saglik");
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
