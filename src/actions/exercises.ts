"use server";

import { db } from "@/db";
import { exercises } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleExerciseCompleted(id: number, isCompleted: boolean) {
  await db.update(exercises).set({ isCompleted }).where(eq(exercises.id, id));
  revalidatePath("/");
}

export async function getExercisesByDay(dailyPlanId: number) {
  return db
    .select()
    .from(exercises)
    .where(eq(exercises.dailyPlanId, dailyPlanId))
    .orderBy(exercises.sortOrder);
}
