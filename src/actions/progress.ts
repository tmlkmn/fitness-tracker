"use server";

import { db } from "@/db";
import { progressLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";

export async function addProgressLog(data: {
  logDate: string;
  // Ana Bilgiler
  weight?: string;
  fluidPercent?: string;
  fluidKg?: string;
  fatPercent?: string;
  fatKg?: string;
  bmi?: string;
  // Vücut Bölgeleri
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
  // Ölçüler
  waistCm?: string;
  rightArmCm?: string;
  leftArmCm?: string;
  rightLegCm?: string;
  leftLegCm?: string;
  // Meta
  notes?: string;
}) {
  const user = await getAuthUser();
  await db.insert(progressLogs).values({ ...data, userId: user.id });
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
