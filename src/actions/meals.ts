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

export async function toggleMealCompleted(id: number, isCompleted: boolean) {
  const user = await getAuthUser();
  await verifyMealOwnership(id, user.id);
  await db.update(meals).set({ isCompleted }).where(eq(meals.id, id));
  revalidatePath("/");
}

export async function getMealsByDay(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);
  return db
    .select()
    .from(meals)
    .where(eq(meals.dailyPlanId, dailyPlanId))
    .orderBy(meals.sortOrder);
}
