"use server";

import { db } from "@/db";
import { meals, dailyPlans, weeklyPlans } from "@/db/schema";
import { eq, and, desc, ne, sql, gte } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

/**
 * (a) Get recent meals for the same mealLabel from past days.
 */
export async function getRecentMealsByLabel(
  mealLabel: string,
  excludeDailyPlanId: number,
) {
  const user = await getAuthUser();

  return db
    .select({
      date: dailyPlans.date,
      mealTime: meals.mealTime,
      mealLabel: meals.mealLabel,
      content: meals.content,
      calories: meals.calories,
      proteinG: meals.proteinG,
      carbsG: meals.carbsG,
      fatG: meals.fatG,
    })
    .from(meals)
    .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        eq(meals.mealLabel, mealLabel),
        ne(meals.dailyPlanId, excludeDailyPlanId),
      ),
    )
    .orderBy(desc(dailyPlans.date))
    .limit(14);
}

/**
 * (e) Get most frequently used meals from the last 14 days.
 */
export async function getFrequentRecentMeals() {
  const user = await getAuthUser();
  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const today = getTurkeyTodayStr();
  const fourteenDaysAgo = new Date(today + "T00:00:00");
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const dateStr = `${fourteenDaysAgo.getFullYear()}-${String(fourteenDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(fourteenDaysAgo.getDate()).padStart(2, "0")}`;

  return db
    .select({
      content: meals.content,
      mealLabel: meals.mealLabel,
      avgCalories: sql<number>`ROUND(AVG(${meals.calories}))`.as("avg_calories"),
      avgProtein: sql<string>`ROUND(AVG(${meals.proteinG}::numeric), 1)::text`.as("avg_protein"),
      avgCarbs: sql<string>`ROUND(AVG(${meals.carbsG}::numeric), 1)::text`.as("avg_carbs"),
      avgFat: sql<string>`ROUND(AVG(${meals.fatG}::numeric), 1)::text`.as("avg_fat"),
      count: sql<number>`COUNT(*)::int`.as("count"),
    })
    .from(meals)
    .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        gte(dailyPlans.date, dateStr),
      ),
    )
    .groupBy(meals.content, meals.mealLabel)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(10);
}
