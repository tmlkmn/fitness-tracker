"use server";

import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

export async function getNotificationPreferences() {
  const user = await getAuthUser();
  const [prefs] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id));

  return prefs ?? {
    inAppEnabled: false,
    emailEnabled: false,
    pushEnabled: false,
    defaultWorkoutTime: "19:00",
    timezone: "Europe/Istanbul",
    quietHoursStart: null,
    quietHoursEnd: null,
    weekStartsOn: "monday",
  };
}

export async function updateNotificationPreferences(data: {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  defaultWorkoutTime?: string;
  timezone?: string;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  weekStartsOn?: "monday" | "sunday";
}) {
  const user = await getAuthUser();

  const [existing] = await db
    .select({ id: notificationPreferences.id })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id));

  if (existing) {
    await db
      .update(notificationPreferences)
      .set(data)
      .where(eq(notificationPreferences.id, existing.id));
  } else {
    await db.insert(notificationPreferences).values({
      userId: user.id,
      ...data,
    });
  }
}
