"use server";

import { db } from "@/db";
import { weeklyPlans, dailyPlans, meals, exercises } from "@/db/schema";
import { eq, and, sql, asc, isNotNull } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

interface DayCompletion {
  date: string;
  totalMeals: number;
  completedMeals: number;
  totalExercises: number;
  completedExercises: number;
}

export interface ActivityStats {
  currentStreak: number;
  longestStreak: number;
  completionMap: Record<string, "full" | "partial" | "none">;
  totalCompletedDays: number;
  totalWorkouts: number;
  totalMeals: number;
  firstCompletedDate: string | null;
  programStartDate: string | null;
}

export async function getActivityStats(): Promise<ActivityStats> {
  const user = await getAuthUser();

  // Get all daily plans with meal/exercise completion counts
  const rows = await db
    .select({
      date: dailyPlans.date,
      totalMeals: sql<number>`(SELECT COUNT(*) FROM meals WHERE meals.daily_plan_id = ${dailyPlans.id})`.as("total_meals"),
      completedMeals: sql<number>`(SELECT COUNT(*) FROM meals WHERE meals.daily_plan_id = ${dailyPlans.id} AND meals.is_completed = true)`.as("completed_meals"),
      totalExercises: sql<number>`(SELECT COUNT(*) FROM exercises WHERE exercises.daily_plan_id = ${dailyPlans.id})`.as("total_exercises"),
      completedExercises: sql<number>`(SELECT COUNT(*) FROM exercises WHERE exercises.daily_plan_id = ${dailyPlans.id} AND exercises.is_completed = true)`.as("completed_exercises"),
    })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        isNotNull(dailyPlans.date),
      ),
    )
    .orderBy(asc(dailyPlans.date));

  const dayMap = new Map<string, DayCompletion>();
  let totalWorkouts = 0;
  let totalMealsCount = 0;
  let programStartDate: string | null = null;

  for (const row of rows) {
    if (!row.date) continue;
    if (!programStartDate) programStartDate = row.date;

    const tm = Number(row.totalMeals);
    const cm = Number(row.completedMeals);
    const te = Number(row.totalExercises);
    const ce = Number(row.completedExercises);

    totalWorkouts += ce;
    totalMealsCount += cm;

    dayMap.set(row.date, {
      date: row.date,
      totalMeals: tm,
      completedMeals: cm,
      totalExercises: te,
      completedExercises: ce,
    });
  }

  // Build completion map and calculate streaks
  const completionMap: Record<string, "full" | "partial" | "none"> = {};
  const fullDays: string[] = [];
  let firstCompletedDate: string | null = null;

  for (const [date, day] of dayMap) {
    const totalItems = day.totalMeals + day.totalExercises;
    const completedItems = day.completedMeals + day.completedExercises;

    if (totalItems === 0) {
      completionMap[date] = "none";
    } else if (completedItems === totalItems) {
      completionMap[date] = "full";
      fullDays.push(date);
      if (!firstCompletedDate) firstCompletedDate = date;
    } else if (completedItems > 0) {
      completionMap[date] = "partial";
    } else {
      completionMap[date] = "none";
    }
  }

  // Calculate streaks
  const { getTurkeyTodayStr, formatDateStr } = await import("@/lib/utils");
  const todayStr = getTurkeyTodayStr();
  const fullDaysSet = new Set(fullDays);

  // Current streak: count backwards from today (or yesterday if today not yet complete)
  let currentStreak = 0;
  const startDate = new Date(todayStr + "T00:00:00");

  // Check if today is "full" — if not, start from yesterday
  if (!fullDaysSet.has(todayStr)) {
    startDate.setDate(startDate.getDate() - 1);
  }

  const cursor = new Date(startDate);
  while (true) {
    const dateStr = formatDateStr(cursor);
    if (fullDaysSet.has(dateStr)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak: scan all dates
  let longestStreak = 0;
  let currentRun = 0;
  const sortedFullDays = [...fullDays].sort();

  for (let i = 0; i < sortedFullDays.length; i++) {
    if (i === 0) {
      currentRun = 1;
    } else {
      const prev = new Date(sortedFullDays[i - 1] + "T00:00:00");
      const curr = new Date(sortedFullDays[i] + "T00:00:00");
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentRun);
  }

  return {
    currentStreak,
    longestStreak,
    completionMap,
    totalCompletedDays: fullDays.length,
    totalWorkouts,
    totalMeals: totalMealsCount,
    firstCompletedDate,
    programStartDate,
  };
}
