"use server";

import { db } from "@/db";
import { waterLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";

export async function getWaterLog(dateStr: string) {
  const user = await getAuthUser();
  const [log] = await db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, user.id), eq(waterLogs.logDate, dateStr)));
  return log ?? null;
}

export async function upsertWaterLog(
  dateStr: string,
  glasses: number,
  targetGlasses?: number,
) {
  const user = await getAuthUser();
  const values = {
    userId: user.id,
    logDate: dateStr,
    glasses,
    ...(targetGlasses != null ? { targetGlasses } : {}),
  };

  await db
    .insert(waterLogs)
    .values(values)
    .onConflictDoUpdate({
      target: [waterLogs.userId, waterLogs.logDate],
      set: {
        glasses,
        ...(targetGlasses != null ? { targetGlasses } : {}),
      },
    });

  revalidatePath("/");
}

export async function incrementWater(dateStr: string, delta: number) {
  const user = await getAuthUser();
  const [existing] = await db
    .select({ glasses: waterLogs.glasses })
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, user.id), eq(waterLogs.logDate, dateStr)));

  const current = existing?.glasses ?? 0;
  const next = Math.max(0, current + delta);

  await db
    .insert(waterLogs)
    .values({ userId: user.id, logDate: dateStr, glasses: next })
    .onConflictDoUpdate({
      target: [waterLogs.userId, waterLogs.logDate],
      set: { glasses: next },
    });

  revalidatePath("/");
}

export async function getWaterLogs(limit = 30) {
  const user = await getAuthUser();
  return db
    .select()
    .from(waterLogs)
    .where(eq(waterLogs.userId, user.id))
    .orderBy(desc(waterLogs.logDate))
    .limit(limit);
}

export async function getTodayWaterLog() {
  const user = await getAuthUser();
  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const today = getTurkeyTodayStr();
  const [log] = await db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, user.id), eq(waterLogs.logDate, today)));
  return log ?? null;
}
