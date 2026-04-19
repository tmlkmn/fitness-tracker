"use server";

import { db } from "@/db";
import { sleepLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";

function computeDurationMinutes(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let bedMin = bh * 60 + bm;
  const wakeMin = wh * 60 + wm;
  // Handle overnight (e.g. 23:30 → 07:00)
  if (bedMin >= wakeMin) bedMin -= 24 * 60;
  return wakeMin - bedMin;
}

interface SleepData {
  logDate: string;
  bedtime: string;
  wakeTime: string;
  quality?: number | null;
  notes?: string | null;
}

export async function getSleepLogByDate(dateStr: string) {
  const user = await getAuthUser();
  const [log] = await db
    .select()
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, user.id), eq(sleepLogs.logDate, dateStr)));
  return log ?? null;
}

export async function upsertSleepLog(data: SleepData) {
  const user = await getAuthUser();
  const duration = computeDurationMinutes(data.bedtime, data.wakeTime);

  const values = {
    userId: user.id,
    logDate: data.logDate,
    bedtime: data.bedtime,
    wakeTime: data.wakeTime,
    durationMinutes: duration,
    quality: data.quality ?? null,
    notes: data.notes ?? null,
  };

  await db
    .insert(sleepLogs)
    .values(values)
    .onConflictDoUpdate({
      target: [sleepLogs.userId, sleepLogs.logDate],
      set: {
        bedtime: data.bedtime,
        wakeTime: data.wakeTime,
        durationMinutes: duration,
        quality: data.quality ?? null,
        notes: data.notes ?? null,
      },
    });

  revalidatePath("/");
}

export async function deleteSleepLog(id: number) {
  const user = await getAuthUser();
  const [log] = await db
    .select({ id: sleepLogs.id })
    .from(sleepLogs)
    .where(and(eq(sleepLogs.id, id), eq(sleepLogs.userId, user.id)));
  if (!log) throw new Error("Not found");

  await db.delete(sleepLogs).where(eq(sleepLogs.id, id));
  revalidatePath("/");
}

export async function getSleepLogs(limit = 30) {
  const user = await getAuthUser();
  return db
    .select()
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, user.id))
    .orderBy(desc(sleepLogs.logDate))
    .limit(limit);
}

export async function getLatestSleepLog() {
  const user = await getAuthUser();
  const [log] = await db
    .select()
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, user.id))
    .orderBy(desc(sleepLogs.logDate))
    .limit(1);
  return log ?? null;
}
