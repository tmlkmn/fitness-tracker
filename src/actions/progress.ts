"use server";

import { db } from "@/db";
import { progressLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addProgressLog(data: {
  userId: number;
  logDate: string;
  weight?: string;
  waistCm?: string;
  notes?: string;
}) {
  await db.insert(progressLogs).values(data);
  revalidatePath("/ilerleme");
}

export async function getProgressLogs(userId: number) {
  return db
    .select()
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate));
}
