"use server";

import { db } from "@/db";
import { meals, dailyPlans, weeklyPlans, exercises, userFoods } from "@/db/schema";
import { and, eq, ilike, sql, desc, or } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

export interface SearchResults {
  days: Array<{ id: number; date: string | null; dayName: string; planType: string; workoutTitle: string | null }>;
  meals: Array<{ id: number; content: string; mealLabel: string; dailyPlanId: number | null; date: string | null }>;
  exercises: Array<{ id: number; name: string; dailyPlanId: number | null; date: string | null }>;
  foods: Array<{ id: number; name: string; portion: string; calories: number }>;
}

export async function globalSearch(query: string): Promise<SearchResults> {
  const user = await getAuthUser();
  const q = query.trim();
  if (q.length < 2) {
    return { days: [], meals: [], exercises: [], foods: [] };
  }
  const pattern = `%${q}%`;

  const [dayRows, mealRows, exerciseRows, foodRows] = await Promise.all([
    db
      .select({
        id: dailyPlans.id,
        date: dailyPlans.date,
        dayName: dailyPlans.dayName,
        planType: dailyPlans.planType,
        workoutTitle: dailyPlans.workoutTitle,
      })
      .from(dailyPlans)
      .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
      .where(
        and(
          eq(weeklyPlans.userId, user.id),
          or(
            ilike(dailyPlans.workoutTitle, pattern),
            ilike(dailyPlans.dayName, pattern),
            sql`${dailyPlans.date}::text ILIKE ${pattern}`,
          ),
        ),
      )
      .orderBy(desc(dailyPlans.date))
      .limit(10),
    db
      .select({
        id: meals.id,
        content: meals.content,
        mealLabel: meals.mealLabel,
        dailyPlanId: meals.dailyPlanId,
        date: dailyPlans.date,
      })
      .from(meals)
      .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
      .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
      .where(
        and(
          eq(weeklyPlans.userId, user.id),
          or(
            ilike(meals.content, pattern),
            ilike(meals.mealLabel, pattern),
          ),
        ),
      )
      .orderBy(desc(dailyPlans.date))
      .limit(10),
    db
      .select({
        id: exercises.id,
        name: exercises.name,
        dailyPlanId: exercises.dailyPlanId,
        date: dailyPlans.date,
      })
      .from(exercises)
      .innerJoin(dailyPlans, eq(exercises.dailyPlanId, dailyPlans.id))
      .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
      .where(
        and(
          eq(weeklyPlans.userId, user.id),
          ilike(exercises.name, pattern),
        ),
      )
      .orderBy(desc(dailyPlans.date))
      .limit(10),
    db
      .select({
        id: userFoods.id,
        name: userFoods.name,
        portion: userFoods.portion,
        calories: userFoods.calories,
      })
      .from(userFoods)
      .where(
        and(
          eq(userFoods.userId, user.id),
          ilike(userFoods.name, pattern),
        ),
      )
      .limit(8),
  ]);

  return {
    days: dayRows,
    meals: mealRows,
    exercises: exerciseRows,
    foods: foodRows,
  };
}
