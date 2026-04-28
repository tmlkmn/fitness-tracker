"use server";

import { db } from "@/db";
import { meals } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  verifyMealOwnership,
  verifyDailyPlanOwnership,
} from "@/lib/ownership";
import { coerceMealLabel } from "@/lib/meal-labels";

interface MealInput {
  mealTime: string;
  mealLabel: string;
  content: string;
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
  icon?: string | null;
}

export async function createMeal(dailyPlanId: number, data: MealInput) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  const [meal] = await db
    .insert(meals)
    .values({
      dailyPlanId,
      mealTime: data.mealTime,
      // Coerce to canonical vocabulary — defense against UI bypass (direct
      // server-action calls). Matches DB CHECK constraint from migration 0031.
      mealLabel: coerceMealLabel(data.mealLabel),
      content: data.content,
      calories: data.calories ?? null,
      proteinG: data.proteinG ?? null,
      carbsG: data.carbsG ?? null,
      fatG: data.fatG ?? null,
      icon: data.icon ?? null,
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
      mealLabel: coerceMealLabel(data.mealLabel),
      content: data.content,
      calories: data.calories ?? null,
      proteinG: data.proteinG ?? null,
      carbsG: data.carbsG ?? null,
      fatG: data.fatG ?? null,
      icon: data.icon ?? null,
    })
    .where(eq(meals.id, mealId));

  revalidatePath("/");
}

export async function deleteMeal(mealId: number) {
  const user = await getAuthUser();
  await verifyMealOwnership(mealId, user.id);

  await db.delete(meals).where(eq(meals.id, mealId));

  // Remove this mealId from any shopping list references; null out empty arrays
  await db.execute(sql`
    UPDATE shopping_lists
    SET meal_ids = (
      SELECT CASE
        WHEN COUNT(*) = 0 THEN NULL
        ELSE jsonb_agg(elem)
      END
      FROM jsonb_array_elements(meal_ids) AS elem
      WHERE (elem)::text::int <> ${mealId}
    )
    WHERE meal_ids @> ${JSON.stringify([mealId])}::jsonb
  `);

  revalidatePath("/");
  revalidatePath("/alisveris");
}

export async function bulkCreateMeals(dailyPlanId: number, items: MealInput[]) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  for (let i = 0; i < items.length; i++) {
    const data = items[i];
    await db.insert(meals).values({
      dailyPlanId,
      mealTime: data.mealTime,
      mealLabel: coerceMealLabel(data.mealLabel),
      content: data.content,
      calories: data.calories ?? null,
      proteinG: data.proteinG ?? null,
      carbsG: data.carbsG ?? null,
      fatG: data.fatG ?? null,
      isCompleted: false,
      sortOrder: i,
    });
  }

  revalidatePath("/");
}

export async function deleteAllMeals(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  await db.delete(meals).where(eq(meals.dailyPlanId, dailyPlanId));

  revalidatePath("/");
}
