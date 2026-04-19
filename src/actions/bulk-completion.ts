"use server";

import { db } from "@/db";
import { meals, exercises } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { verifyDailyPlanOwnership } from "@/lib/ownership";

export async function completeAllMeals(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  await db
    .update(meals)
    .set({ isCompleted: true })
    .where(and(eq(meals.dailyPlanId, dailyPlanId), eq(meals.isCompleted, false)));

  revalidatePath("/");
}

export async function completeAllExercises(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  await db
    .update(exercises)
    .set({ isCompleted: true })
    .where(and(eq(exercises.dailyPlanId, dailyPlanId), eq(exercises.isCompleted, false)));

  revalidatePath("/");
}
