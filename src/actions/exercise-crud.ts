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

interface ExerciseInput {
  section: string;
  sectionLabel: string;
  name: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
}

export async function createExercise(
  dailyPlanId: number,
  data: ExerciseInput,
) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  const [exercise] = await db
    .insert(exercises)
    .values({
      dailyPlanId,
      section: data.section,
      sectionLabel: data.sectionLabel,
      name: data.name,
      sets: data.sets ?? null,
      reps: data.reps ?? null,
      restSeconds: data.restSeconds ?? null,
      durationMinutes: data.durationMinutes ?? null,
      notes: data.notes ?? null,
      isCompleted: false,
      sortOrder: 0,
    })
    .returning({ id: exercises.id });

  revalidatePath("/");
  return exercise;
}

export async function updateExercise(
  exerciseId: number,
  data: ExerciseInput,
) {
  const user = await getAuthUser();
  await verifyExerciseOwnership(exerciseId, user.id);

  await db
    .update(exercises)
    .set({
      section: data.section,
      sectionLabel: data.sectionLabel,
      name: data.name,
      sets: data.sets ?? null,
      reps: data.reps ?? null,
      restSeconds: data.restSeconds ?? null,
      durationMinutes: data.durationMinutes ?? null,
      notes: data.notes ?? null,
    })
    .where(eq(exercises.id, exerciseId));

  revalidatePath("/");
}

export async function deleteExercise(exerciseId: number) {
  const user = await getAuthUser();
  await verifyExerciseOwnership(exerciseId, user.id);

  await db.delete(exercises).where(eq(exercises.id, exerciseId));

  revalidatePath("/");
}

export async function deleteAllExercises(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  await db.delete(exercises).where(eq(exercises.dailyPlanId, dailyPlanId));

  revalidatePath("/");
}
