import { db } from "@/db";
import {
  weeklyPlans,
  dailyPlans,
  meals,
  exercises,
  supplements,
} from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";

export type WeeklyPlanRow = typeof weeklyPlans.$inferSelect;
export type DailyPlanRow = typeof dailyPlans.$inferSelect;
export type MealRow = typeof meals.$inferSelect;
export type ExerciseRow = typeof exercises.$inferSelect;
export type SupplementRow = typeof supplements.$inferSelect;

export interface CollectedDay extends DailyPlanRow {
  meals: MealRow[];
  exercises: ExerciseRow[];
}

export interface CollectedWeeklyPlan {
  plan: WeeklyPlanRow;
  days: CollectedDay[];
  supplements: SupplementRow[];
}

/**
 * Assembles a full weekly-plan tree (week → days → meals + exercises, plus the
 * week's supplements) in a fixed number of queries. Meals and exercises are
 * batched with `inArray` over the day ids — never N queries per day. Mirrors
 * the batch pattern in `buildWeeklyPlanContext` (src/lib/ai-weekly.ts).
 *
 * Access is NOT enforced here — callers must run a verify* check first
 * (e.g. verifyWeeklyPlanReadAccess). Returns null if the plan does not exist.
 */
export async function collectWeeklyPlan(
  weeklyPlanId: number,
): Promise<CollectedWeeklyPlan | null> {
  const [plan] = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.id, weeklyPlanId));
  if (!plan) return null;

  const days = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId))
    .orderBy(asc(dailyPlans.dayOfWeek));

  const dayIds = days.map((d) => d.id);

  const [mealRows, exerciseRows, supplementRows] = await Promise.all([
    dayIds.length
      ? db
          .select()
          .from(meals)
          .where(inArray(meals.dailyPlanId, dayIds))
          .orderBy(asc(meals.sortOrder))
      : Promise.resolve([] as MealRow[]),
    dayIds.length
      ? db
          .select()
          .from(exercises)
          .where(inArray(exercises.dailyPlanId, dayIds))
          .orderBy(asc(exercises.sortOrder))
      : Promise.resolve([] as ExerciseRow[]),
    db
      .select()
      .from(supplements)
      .where(eq(supplements.weeklyPlanId, weeklyPlanId)),
  ]);

  const mealsByDay = new Map<number, MealRow[]>();
  for (const m of mealRows) {
    if (m.dailyPlanId == null) continue;
    const list = mealsByDay.get(m.dailyPlanId) ?? [];
    list.push(m);
    mealsByDay.set(m.dailyPlanId, list);
  }

  const exercisesByDay = new Map<number, ExerciseRow[]>();
  for (const e of exerciseRows) {
    if (e.dailyPlanId == null) continue;
    const list = exercisesByDay.get(e.dailyPlanId) ?? [];
    list.push(e);
    exercisesByDay.set(e.dailyPlanId, list);
  }

  return {
    plan,
    days: days.map((d) => ({
      ...d,
      meals: mealsByDay.get(d.id) ?? [],
      exercises: exercisesByDay.get(d.id) ?? [],
    })),
    supplements: supplementRows,
  };
}

/**
 * Fetches a single day with its meals and exercises (for the daily-plan PDF).
 * Access must be verified by the caller (verifyDailyPlanReadAccess).
 */
export async function collectDailyPlan(dailyPlanId: number): Promise<CollectedDay | null> {
  const [day] = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));
  if (!day) return null;

  const [mealRows, exerciseRows] = await Promise.all([
    db
      .select()
      .from(meals)
      .where(eq(meals.dailyPlanId, dailyPlanId))
      .orderBy(asc(meals.sortOrder)),
    db
      .select()
      .from(exercises)
      .where(eq(exercises.dailyPlanId, dailyPlanId))
      .orderBy(asc(exercises.sortOrder)),
  ]);

  return { ...day, meals: mealRows, exercises: exerciseRows };
}
