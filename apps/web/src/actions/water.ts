"use server";

import { db } from "@/db";
import { waterLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { computeWaterTarget } from "@/lib/water-target";

export async function getWaterLog(dateStr: string) {
  const user = await getAuthUser();
  const [log] = await db
    .select()
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, user.id), eq(waterLogs.logDate, dateStr)));
  return log ?? null;
}

/**
 * Returns the personalized water target (in glasses) for the user on a given
 * date. UI uses this as a fallback when no log row exists yet, and as the
 * value to persist on first log creation.
 */
export async function getDailyWaterTarget(dateStr: string): Promise<number> {
  const user = await getAuthUser();
  return computeWaterTarget(user.id, dateStr);
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
}

export async function incrementWater(dateStr: string, delta: number) {
  const user = await getAuthUser();
  const [existing] = await db
    .select({ glasses: waterLogs.glasses })
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, user.id), eq(waterLogs.logDate, dateStr)));

  const current = existing?.glasses ?? 0;
  const next = Math.max(0, current + delta);

  // First-touch: compute personalized target and persist it on row creation.
  // Existing rows keep their already-stored target (user may have edited it
  // manually elsewhere). This way the default 8 isn't sticky for new users.
  const personalizedTarget = existing
    ? null
    : await computeWaterTarget(user.id, dateStr);

  await db
    .insert(waterLogs)
    .values({
      userId: user.id,
      logDate: dateStr,
      glasses: next,
      ...(personalizedTarget != null ? { targetGlasses: personalizedTarget } : {}),
    })
    .onConflictDoUpdate({
      target: [waterLogs.userId, waterLogs.logDate],
      set: { glasses: next },
    });
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
