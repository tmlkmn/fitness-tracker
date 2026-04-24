"use server";

import { db } from "@/db";
import { weeklyPlans, dailyPlans, supplements, meals, exercises } from "@/db/schema";
import { eq, asc, and, gte, lte, isNotNull, sql, inArray } from "drizzle-orm";
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
  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const todayStr = getTurkeyTodayStr();

  const dailyPlan = await getDailyPlanByDate(todayStr);
  if (!dailyPlan) return { dailyPlan: null, meals: [], exercises: [], weeklyPlan: null };

  const [mealRows, exerciseRows, weeklyPlan] = await Promise.all([
    db
      .select()
      .from(meals)
      .where(eq(meals.dailyPlanId, dailyPlan.id))
      .orderBy(meals.mealTime),
    db
      .select()
      .from(exercises)
      .where(eq(exercises.dailyPlanId, dailyPlan.id))
      .orderBy(exercises.sortOrder),
    getWeeklyPlanByDate(todayStr),
  ]);

  return { dailyPlan, meals: mealRows, exercises: exerciseRows, weeklyPlan };
}

/**
 * Returns an array of Monday date strings (YYYY-MM-DD) for weeks between
 * todayStr and targetWeekStart that have no plan or only empty plans
 * (all dailyPlans have 0 meals + 0 exercises).
 */
export async function getEmptyWeeksBetween(
  todayStr: string,
  targetWeekStart: string
): Promise<string[]> {
  const user = await getAuthUser();

  // Calculate the Monday of today's week
  const todayDate = new Date(todayStr + "T00:00:00");
  const dow = todayDate.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const currentMonday = new Date(todayDate);
  currentMonday.setDate(currentMonday.getDate() + diff);

  // Collect all Mondays between current week and target week (exclusive of target)
  const mondays: string[] = [];
  const d = new Date(currentMonday);
  const target = new Date(targetWeekStart + "T00:00:00");

  while (d < target) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    mondays.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 7);
  }

  if (mondays.length === 0) return [];

  // Get all weekly plans for this user in the date range
  const userWeeklyPlans = await db
    .select({
      id: weeklyPlans.id,
      startDate: weeklyPlans.startDate,
    })
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        gte(weeklyPlans.startDate, mondays[0]),
        lte(weeklyPlans.startDate, mondays[mondays.length - 1])
      )
    );

  // For each weekly plan, count total meals + exercises
  const planMap = new Map<string, number>(); // startDate -> weeklyPlanId

  for (const wp of userWeeklyPlans) {
    if (wp.startDate) planMap.set(wp.startDate, wp.id);
  }

  const emptyWeeks: string[] = [];

  for (const monday of mondays) {
    const wpId = planMap.get(monday);
    if (!wpId) {
      // No weekly plan at all — empty week
      emptyWeeks.push(monday);
      continue;
    }

    // Check if this weekly plan has any content
    const [mealCount, exerciseCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(meals)
        .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
        .where(eq(dailyPlans.weeklyPlanId, wpId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(exercises)
        .innerJoin(dailyPlans, eq(exercises.dailyPlanId, dailyPlans.id))
        .where(eq(dailyPlans.weeklyPlanId, wpId)),
    ]);

    const totalContent =
      Number(mealCount[0]?.count ?? 0) + Number(exerciseCount[0]?.count ?? 0);

    if (totalContent === 0) {
      emptyWeeks.push(monday);
    }
  }

  return emptyWeeks;
}

/**
 * Returns Monday date strings (YYYY-MM-DD) of weeks whose start date falls
 * within the given month AND that have no plan or only empty plans
 * (0 meals + 0 exercises). Used to gate AI generation for future months.
 */
export async function getEmptyWeeksInMonth(
  year: number,
  month: number, // 1-12
): Promise<string[]> {
  const user = await getAuthUser();

  const mm = String(month).padStart(2, "0");
  const firstDay = `${year}-${mm}-01`;
  const lastDayDate = new Date(year, month, 0); // day 0 of next month = last day of this month
  const lastDay = `${year}-${mm}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

  // Find the first Monday on or after firstDay
  const firstDate = new Date(firstDay + "T00:00:00");
  const dow = firstDate.getDay(); // 0=Sun..6=Sat
  const daysUntilMonday = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  const firstMonday = new Date(firstDate);
  firstMonday.setDate(firstMonday.getDate() + daysUntilMonday);

  const mondays: string[] = [];
  const d = new Date(firstMonday);
  const lastDate = new Date(lastDay + "T00:00:00");
  while (d <= lastDate) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    mondays.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 7);
  }

  if (mondays.length === 0) return [];

  const userWeeklyPlans = await db
    .select({ id: weeklyPlans.id, startDate: weeklyPlans.startDate })
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        gte(weeklyPlans.startDate, mondays[0]),
        lte(weeklyPlans.startDate, mondays[mondays.length - 1]),
      ),
    );

  const planMap = new Map<string, number>();
  for (const wp of userWeeklyPlans) {
    if (wp.startDate) planMap.set(wp.startDate, wp.id);
  }

  const emptyWeeks: string[] = [];
  for (const monday of mondays) {
    const wpId = planMap.get(monday);
    if (!wpId) {
      emptyWeeks.push(monday);
      continue;
    }
    const [mealCount, exerciseCount] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(meals)
        .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
        .where(eq(dailyPlans.weeklyPlanId, wpId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(exercises)
        .innerJoin(dailyPlans, eq(exercises.dailyPlanId, dailyPlans.id))
        .where(eq(dailyPlans.weeklyPlanId, wpId)),
    ]);
    const total =
      Number(mealCount[0]?.count ?? 0) + Number(exerciseCount[0]?.count ?? 0);
    if (total === 0) emptyWeeks.push(monday);
  }
  return emptyWeeks;
}

export async function getDailyPlansWithContentCounts(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);

  const days = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId))
    .orderBy(asc(dailyPlans.dayOfWeek));

  if (days.length === 0) return [];

  const dayIds = days.map((d) => d.id);

  const [exerciseCounts, mealCounts] = await Promise.all([
    db
      .select({
        dailyPlanId: exercises.dailyPlanId,
        count: sql<number>`count(*)::int`,
      })
      .from(exercises)
      .where(inArray(exercises.dailyPlanId, dayIds))
      .groupBy(exercises.dailyPlanId),
    db
      .select({
        dailyPlanId: meals.dailyPlanId,
        count: sql<number>`count(*)::int`,
      })
      .from(meals)
      .where(inArray(meals.dailyPlanId, dayIds))
      .groupBy(meals.dailyPlanId),
  ]);

  const exMap = new Map(
    exerciseCounts.map((e) => [e.dailyPlanId, Number(e.count)]),
  );
  const mealMap = new Map(
    mealCounts.map((m) => [m.dailyPlanId, Number(m.count)]),
  );

  return days.map((d) => ({
    ...d,
    exerciseCount: exMap.get(d.id) ?? 0,
    mealCount: mealMap.get(d.id) ?? 0,
  }));
}

export async function getUpcomingDailyPlans() {
  const user = await getAuthUser();
  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const today = getTurkeyTodayStr();
  return db
    .select({
      id: dailyPlans.id,
      weeklyPlanId: dailyPlans.weeklyPlanId,
      dayOfWeek: dailyPlans.dayOfWeek,
      dayName: dailyPlans.dayName,
      planType: dailyPlans.planType,
      workoutTitle: dailyPlans.workoutTitle,
      date: dailyPlans.date,
    })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        gte(dailyPlans.date, today),
      ),
    )
    .orderBy(asc(dailyPlans.date))
    .limit(40);
}
