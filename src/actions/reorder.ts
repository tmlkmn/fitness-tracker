"use server";

import { db } from "@/db";
import { meals, exercises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { verifyDailyPlanOwnership } from "@/lib/ownership";

export async function reorderMeals(dailyPlanId: number, orderedIds: number[]) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(meals)
      .set({ sortOrder: i })
      .where(eq(meals.id, orderedIds[i]));
  }

  revalidatePath("/");
}

export async function reorderExercises(dailyPlanId: number, orderedIds: number[]) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(exercises)
      .set({ sortOrder: i })
      .where(eq(exercises.id, orderedIds[i]));
  }

  revalidatePath("/");
}
