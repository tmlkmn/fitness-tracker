"use server";

import { db } from "@/db";
import { progressLogs } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";

type ProgressData = {
  logDate: string;
  weight?: string;
  fluidPercent?: string;
  fluidKg?: string;
  fatPercent?: string;
  fatKg?: string;
  bmi?: string;
  leftArmFatPercent?: string;
  leftArmFatKg?: string;
  leftArmMusclePercent?: string;
  leftArmMuscleKg?: string;
  rightArmFatPercent?: string;
  rightArmFatKg?: string;
  rightArmMusclePercent?: string;
  rightArmMuscleKg?: string;
  torsoFatPercent?: string;
  torsoFatKg?: string;
  torsoMusclePercent?: string;
  torsoMuscleKg?: string;
  leftLegFatPercent?: string;
  leftLegFatKg?: string;
  leftLegMusclePercent?: string;
  leftLegMuscleKg?: string;
  rightLegFatPercent?: string;
  rightLegFatKg?: string;
  rightLegMusclePercent?: string;
  rightLegMuscleKg?: string;
  waistCm?: string;
  rightArmCm?: string;
  leftArmCm?: string;
  rightLegCm?: string;
  leftLegCm?: string;
  notes?: string;
};

export async function addProgressLog(data: ProgressData) {
  const user = await getAuthUser();
  await db.insert(progressLogs).values({ ...data, userId: user.id });
  revalidatePath("/ilerleme");
}

export async function updateProgressLog(id: number, data: ProgressData) {
  const user = await getAuthUser();

  const [existing] = await db
    .select({ id: progressLogs.id })
    .from(progressLogs)
    .where(and(eq(progressLogs.id, id), eq(progressLogs.userId, user.id)));

  if (!existing) throw new Error("Not found");

  await db
    .update(progressLogs)
    .set(data)
    .where(eq(progressLogs.id, id));

  revalidatePath("/ilerleme");
}

export async function deleteProgressLog(id: number) {
  const user = await getAuthUser();

  const [existing] = await db
    .select({ id: progressLogs.id })
    .from(progressLogs)
    .where(and(eq(progressLogs.id, id), eq(progressLogs.userId, user.id)));

  if (!existing) throw new Error("Not found");

  await db.delete(progressLogs).where(eq(progressLogs.id, id));
  revalidatePath("/ilerleme");
}

export async function getProgressLogs() {
  const user = await getAuthUser();
  return db
    .select()
    .from(progressLogs)
    .where(eq(progressLogs.userId, user.id))
    .orderBy(desc(progressLogs.logDate));
}

export async function getProgressLogCount(): Promise<number> {
  const user = await getAuthUser();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(progressLogs)
    .where(eq(progressLogs.userId, user.id));
  return row?.count ?? 0;
}

export async function getLatestProgressLog() {
  const user = await getAuthUser();
  const [latest] = await db
    .select()
    .from(progressLogs)
    .where(eq(progressLogs.userId, user.id))
    .orderBy(desc(progressLogs.logDate))
    .limit(1);
  return latest ?? null;
}
