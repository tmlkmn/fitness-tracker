"use server";

import { db } from "@/db";
import { progressLogs } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";

// Writable columns of a progress log. Server actions are callable with any
// payload, so writes copy only these keys — never userId / id / createdAt.
const PROGRESS_FIELDS = [
  "logDate",
  "weight",
  "fluidPercent",
  "fluidKg",
  "fatPercent",
  "fatKg",
  "bmi",
  "leftArmFatPercent",
  "leftArmFatKg",
  "leftArmMusclePercent",
  "leftArmMuscleKg",
  "rightArmFatPercent",
  "rightArmFatKg",
  "rightArmMusclePercent",
  "rightArmMuscleKg",
  "torsoFatPercent",
  "torsoFatKg",
  "torsoMusclePercent",
  "torsoMuscleKg",
  "leftLegFatPercent",
  "leftLegFatKg",
  "leftLegMusclePercent",
  "leftLegMuscleKg",
  "rightLegFatPercent",
  "rightLegFatKg",
  "rightLegMusclePercent",
  "rightLegMuscleKg",
  "waistCm",
  "rightArmCm",
  "leftArmCm",
  "rightLegCm",
  "leftLegCm",
  "notes",
] as const;

type ProgressField = (typeof PROGRESS_FIELDS)[number];

type ProgressData = { logDate: string } & {
  [K in Exclude<ProgressField, "logDate">]?: string;
};

function pickProgressFields(data: ProgressData): ProgressData {
  const picked: Partial<Record<ProgressField, string>> = {};
  for (const key of PROGRESS_FIELDS) picked[key] = data[key];
  return picked as ProgressData;
}

export async function addProgressLog(data: ProgressData) {
  const user = await getAuthUser();
  await db
    .insert(progressLogs)
    .values({ ...pickProgressFields(data), userId: user.id });
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
    .set(pickProgressFields(data))
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
