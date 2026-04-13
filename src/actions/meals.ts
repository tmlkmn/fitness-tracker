"use server";

import { db } from "@/db";
import { meals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleMealCompleted(id: number, isCompleted: boolean) {
  await db.update(meals).set({ isCompleted }).where(eq(meals.id, id));
  revalidatePath("/");
}

export async function getMealsByDay(dailyPlanId: number) {
  return db
    .select()
    .from(meals)
    .where(eq(meals.dailyPlanId, dailyPlanId))
    .orderBy(meals.sortOrder);
}
