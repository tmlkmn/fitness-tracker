"use server";

import { db } from "@/db";
import { weeklyPlans, dailyPlans, supplements, meals, exercises } from "@/db/schema";
import { eq, asc, and, gte, lte, isNotNull } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { verifyWeeklyPlanOwnership } from "@/lib/ownership";

export async function getAllWeeks() {
  const user = await getAuthUser();
  return db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.userId, user.id))
    .orderBy(asc(weeklyPlans.weekNumber));
}

export async function getWeeklyPlan(weekNumber: number) {
  const user = await getAuthUser();
  const plans = await db
    .select()
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.weekNumber, weekNumber),
        eq(weeklyPlans.userId, user.id)
      )
    );
  return plans[0] || null;
}

export async function getDailyPlan(dailyPlanId: number) {
  const user = await getAuthUser();
  const plans = await db
    .select({
      id: dailyPlans.id,
      weeklyPlanId: dailyPlans.weeklyPlanId,
      dayOfWeek: dailyPlans.dayOfWeek,
      dayName: dailyPlans.dayName,
      planType: dailyPlans.planType,
      workoutTitle: dailyPlans.workoutTitle,
      date: dailyPlans.date,
      createdAt: dailyPlans.createdAt,
    })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(eq(dailyPlans.id, dailyPlanId), eq(weeklyPlans.userId, user.id))
    );
  return plans[0] || null;
}

export async function getDailyPlansByWeek(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);
  return db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId))
    .orderBy(asc(dailyPlans.dayOfWeek));
}

export async function getSupplementsByWeek(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);
  return db
    .select()
    .from(supplements)
    .where(eq(supplements.weeklyPlanId, weeklyPlanId));
}

// ── Date-based queries ──

export async function getDailyPlanByDate(dateStr: string) {
  const user = await getAuthUser();
  const plans = await db
    .select({
      id: dailyPlans.id,
      weeklyPlanId: dailyPlans.weeklyPlanId,
      dayOfWeek: dailyPlans.dayOfWeek,
      dayName: dailyPlans.dayName,
      planType: dailyPlans.planType,
      workoutTitle: dailyPlans.workoutTitle,
      date: dailyPlans.date,
      createdAt: dailyPlans.createdAt,
    })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(eq(dailyPlans.date, dateStr), eq(weeklyPlans.userId, user.id))
    );
  return plans[0] || null;
}

export async function getWeeklyPlanByDate(dateStr: string) {
  const daily = await getDailyPlanByDate(dateStr);
  if (!daily?.weeklyPlanId) return null;
  const user = await getAuthUser();
  const plans = await db
    .select()
    .from(weeklyPlans)
    .where(
      and(eq(weeklyPlans.id, daily.weeklyPlanId), eq(weeklyPlans.userId, user.id))
    );
  return plans[0] || null;
}

export async function getDailyPlansForWeekByDate(dateStr: string) {
  const weekly = await getWeeklyPlanByDate(dateStr);
  if (!weekly) return { weeklyPlan: null, dailyPlans: [] };
  const days = await getDailyPlansByWeek(weekly.id);
  return { weeklyPlan: weekly, dailyPlans: days };
}

export async function getWeeklyPlanById(id: number) {
  const user = await getAuthUser();
  const plans = await db
    .select()
    .from(weeklyPlans)
    .where(and(eq(weeklyPlans.id, id), eq(weeklyPlans.userId, user.id)));
  return plans[0] || null;
}

export async function getDatesWithPlansForMonth(
  year: number,
  month: number
): Promise<string[]> {
  const user = await getAuthUser();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const rows = await db
    .select({ date: dailyPlans.date })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        gte(dailyPlans.date, startDate),
        lte(dailyPlans.date, endDate),
        isNotNull(dailyPlans.date)
      )
    );
  return rows.map((r) => r.date).filter(Boolean) as string[];
}

export async function getTodayDashboardData() {
  const todayStr = new Date().toISOString().split("T")[0];

  const dailyPlan = await getDailyPlanByDate(todayStr);
  if (!dailyPlan) return { dailyPlan: null, meals: [], exercises: [], weeklyPlan: null };

  const [mealRows, exerciseRows, weeklyPlan] = await Promise.all([
    db
      .select()
      .from(meals)
      .where(eq(meals.dailyPlanId, dailyPlan.id))
      .orderBy(meals.sortOrder),
    db
      .select()
      .from(exercises)
      .where(eq(exercises.dailyPlanId, dailyPlan.id))
      .orderBy(exercises.sortOrder),
    getWeeklyPlanByDate(todayStr),
  ]);

  return { dailyPlan, meals: mealRows, exercises: exerciseRows, weeklyPlan };
}
