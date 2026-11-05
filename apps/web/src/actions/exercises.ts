"use server";

import { db } from "@/db";
import { exercises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  verifyExerciseOwnership,
  verifyDailyPlanOwnership,
} from "@/lib/ownership";

export async function toggleExerciseCompleted(
  id: number,
  isCompleted: boolean
) {
  const user = await getAuthUser();
  await verifyExerciseOwnership(id, user.id);
  await db
    .update(exercises)
    .set({ isCompleted })
    .where(eq(exercises.id, id));
  revalidatePath("/");
}

export async function getExercisesByDay(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);
  return db
    .select()
    .from(exercises)
    .where(eq(exercises.dailyPlanId, dailyPlanId))
    .orderBy(exercises.sortOrder);
}
