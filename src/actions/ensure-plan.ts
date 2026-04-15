"use server";

import { db } from "@/db";
import { weeklyPlans, dailyPlans } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

const TURKISH_DAY_NAMES = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
];

function getMondayStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const jsDay = d.getDay(); // 0=Sun, 1=Mon, ...
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon, 6=Sun
}

/**
 * Finds or creates a dailyPlan for the given date.
 * If no weeklyPlan exists for that week, one is created too.
 * Uses the current authenticated user.
 */
export async function ensureDailyPlan(
  dateStr: string,
): Promise<number> {
  const user = await getAuthUser();
  const userId = user.id;
  // 1. Check if a dailyPlan already exists for this date
  const existing = await db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(eq(dailyPlans.date, dateStr), eq(weeklyPlans.userId, userId)),
    );

  if (existing.length > 0) {
    return existing[0].id;
  }

  // 2. Find or create a weeklyPlan for this week
  const monday = getMondayStr(dateStr);

  const weeklyPlan = await db
    .select({ id: weeklyPlans.id })
    .from(weeklyPlans)
    .where(
      and(eq(weeklyPlans.startDate, monday), eq(weeklyPlans.userId, userId)),
    );

  let weeklyPlanId: number;

  if (weeklyPlan.length > 0) {
    weeklyPlanId = weeklyPlan[0].id;
  } else {
    // Find the max weekNumber for this user
    const [maxRow] = await db
      .select({ max: sql<number>`coalesce(max(${weeklyPlans.weekNumber}), 0)` })
      .from(weeklyPlans)
      .where(eq(weeklyPlans.userId, userId));

    const nextWeekNumber = (maxRow?.max ?? 0) + 1;

    const [newWeek] = await db
      .insert(weeklyPlans)
      .values({
        userId,
        weekNumber: nextWeekNumber,
        title: `Hafta ${nextWeekNumber}`,
        phase: "custom",
        startDate: monday,
      })
      .returning({ id: weeklyPlans.id });

    weeklyPlanId = newWeek.id;
  }

  // 3. Create the dailyPlan
  const dayOfWeek = getDayOfWeek(dateStr);
  const dayName = TURKISH_DAY_NAMES[dayOfWeek];

  const [newDay] = await db
    .insert(dailyPlans)
    .values({
      weeklyPlanId: weeklyPlanId,
      dayOfWeek,
      dayName,
      planType: "workout",
      date: dateStr,
    })
    .returning({ id: dailyPlans.id });

  return newDay.id;
}
