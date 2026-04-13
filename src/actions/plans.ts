"use server";

import { db } from "@/db";
import { weeklyPlans, dailyPlans, supplements, shoppingLists } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getAllWeeks() {
  return db.select().from(weeklyPlans).orderBy(asc(weeklyPlans.weekNumber));
}

export async function getWeeklyPlan(weekNumber: number) {
  const plans = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.weekNumber, weekNumber));
  return plans[0] || null;
}

export async function getDailyPlan(dailyPlanId: number) {
  const plans = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));
  return plans[0] || null;
}

export async function getDailyPlansByWeek(weeklyPlanId: number) {
  return db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId))
    .orderBy(asc(dailyPlans.dayOfWeek));
}

export async function getSupplementsByWeek(weeklyPlanId: number) {
  return db
    .select()
    .from(supplements)
    .where(eq(supplements.weeklyPlanId, weeklyPlanId));
}
