"use server";

import { db } from "@/db";
import { meals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  verifyMealOwnership,
  verifyDailyPlanOwnership,
} from "@/lib/ownership";

interface MealInput {
  mealTime: string;
  mealLabel: string;
  content: string;
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
}

export async function createMeal(dailyPlanId: number, data: MealInput) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  const [meal] = await db
    .insert(meals)
    .values({
      dailyPlanId,
      mealTime: data.mealTime,
      mealLabel: data.mealLabel,
      content: data.content,
      calories: data.calories ?? null,
      proteinG: data.proteinG ?? null,
      carbsG: data.carbsG ?? null,
      fatG: data.fatG ?? null,
      isCompleted: false,
      sortOrder: 0,
    })
    .returning({ id: meals.id });

  revalidatePath("/");
  return meal;
}

export async function updateMeal(mealId: number, data: MealInput) {
  const user = await getAuthUser();
  await verifyMealOwnership(mealId, user.id);

  await db
    .update(meals)
    .set({
      mealTime: data.mealTime,
      mealLabel: data.mealLabel,
      content: data.content,
      calories: data.calories ?? null,
      proteinG: data.proteinG ?? null,
      carbsG: data.carbsG ?? null,
      fatG: data.fatG ?? null,
    })
    .where(eq(meals.id, mealId));

  revalidatePath("/");
}

export async function deleteMeal(mealId: number) {
  const user = await getAuthUser();
  await verifyMealOwnership(mealId, user.id);

  await db.delete(meals).where(eq(meals.id, mealId));

  revalidatePath("/");
}

export async function deleteAllMeals(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  await db.delete(meals).where(eq(meals.dailyPlanId, dailyPlanId));

  revalidatePath("/");
}
