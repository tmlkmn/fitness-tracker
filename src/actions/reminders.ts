"use server";

import { db } from "@/db";
import { reminders } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { REMINDER_TEMPLATES } from "@/lib/reminder-templates";

export async function getReminders() {
  const user = await getAuthUser();
  return db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, user.id))
    .orderBy(reminders.type, reminders.time);
}

export async function createReminder(data: {
  type: "custom" | "meal" | "workout";
  title: string;
  body?: string;
  templateKey?: string;
  time?: string;
  minutesBefore?: number;
  recurrence: string;
  intervalMinutes?: number;
  intervalStart?: string;
  intervalEnd?: string;
  daysOfWeek?: number[];
  onceDate?: string;
  skipEmail?: boolean;
}) {
  const user = await getAuthUser();

  await db.insert(reminders).values({
    userId: user.id,
    type: data.type,
    title: data.title,
    body: data.body ?? null,
    templateKey: data.templateKey ?? null,
    time: data.time ?? null,
    minutesBefore: data.minutesBefore ?? null,
    recurrence: data.recurrence,
    intervalMinutes: data.intervalMinutes ?? null,
    intervalStart: data.intervalStart ?? null,
    intervalEnd: data.intervalEnd ?? null,
    daysOfWeek: data.daysOfWeek ?? null,
    onceDate: data.onceDate ?? null,
    skipEmail: data.skipEmail ?? true,
  });

  revalidatePath("/ayarlar");
}

export async function createReminderFromTemplate(templateKey: string) {
  const user = await getAuthUser();
  const template = REMINDER_TEMPLATES.find((t) => t.key === templateKey);
  if (!template) throw new Error("Şablon bulunamadı");

  // Check if already exists
  const existing = await db
    .select({ id: reminders.id })
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, user.id),
        eq(reminders.templateKey, templateKey)
      )
    );

  if (existing.length > 0) {
    // Re-enable if disabled
    await db
      .update(reminders)
      .set({ isEnabled: true })
      .where(eq(reminders.id, existing[0].id));
  } else {
    await db.insert(reminders).values({
      userId: user.id,
      type: "custom",
      title: template.title,
      body: template.body,
      templateKey: template.key,
      time: template.defaultTime,
      recurrence: template.defaultRecurrence,
      skipEmail: true,
    });
  }

  revalidatePath("/ayarlar");
}

export async function updateReminder(
  id: number,
  data: {
    title?: string;
    body?: string;
    time?: string;
    minutesBefore?: number;
    recurrence?: string;
    daysOfWeek?: number[];
    onceDate?: string;
    skipEmail?: boolean;
  }
) {
  const user = await getAuthUser();

  const [existing] = await db
    .select({ userId: reminders.userId })
    .from(reminders)
    .where(eq(reminders.id, id));

  if (!existing || existing.userId !== user.id) {
    throw new Error("Hatırlatıcı bulunamadı");
  }

  await db.update(reminders).set(data).where(eq(reminders.id, id));
  revalidatePath("/ayarlar");
}

export async function deleteReminder(id: number) {
  const user = await getAuthUser();

  const [existing] = await db
    .select({ userId: reminders.userId })
    .from(reminders)
    .where(eq(reminders.id, id));

  if (!existing || existing.userId !== user.id) {
    throw new Error("Hatırlatıcı bulunamadı");
  }

  await db.delete(reminders).where(eq(reminders.id, id));
  revalidatePath("/ayarlar");
}

export async function toggleReminder(id: number, isEnabled: boolean) {
  const user = await getAuthUser();

  const [existing] = await db
    .select({ userId: reminders.userId })
    .from(reminders)
    .where(eq(reminders.id, id));

  if (!existing || existing.userId !== user.id) {
    throw new Error("Hatırlatıcı bulunamadı");
  }

  await db.update(reminders).set({ isEnabled }).where(eq(reminders.id, id));
  revalidatePath("/ayarlar");
}
