"use server";

import { db } from "@/db";
import {
  weeklyPlans,
  dailyPlans,
  meals,
  exercises,
  supplements,
  shoppingLists,
  users,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import {
  verifyWeeklyPlanReadAccess,
  verifyDailyPlanReadAccess,
} from "@/lib/ownership";

export async function getSharedWeeklyPlan(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanReadAccess(weeklyPlanId, user.id);

  const rows = await db
    .select({
      id: weeklyPlans.id,
      weekNumber: weeklyPlans.weekNumber,
      title: weeklyPlans.title,
      phase: weeklyPlans.phase,
      notes: weeklyPlans.notes,
      startDate: weeklyPlans.startDate,
      ownerName: users.name,
    })
    .from(weeklyPlans)
    .innerJoin(users, eq(weeklyPlans.userId, users.id))
    .where(eq(weeklyPlans.id, weeklyPlanId));

  return rows[0] || null;
}

export async function getSharedDailyPlansByWeek(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanReadAccess(weeklyPlanId, user.id);

  return db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId))
    .orderBy(asc(dailyPlans.dayOfWeek));
}

export async function getSharedDailyPlan(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanReadAccess(dailyPlanId, user.id);

  const plans = await db
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
    .where(eq(dailyPlans.id, dailyPlanId));

  return plans[0] || null;
}

export async function getSharedMealsByDay(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanReadAccess(dailyPlanId, user.id);

  return db
    .select()
    .from(meals)
    .where(eq(meals.dailyPlanId, dailyPlanId))
    .orderBy(asc(meals.sortOrder));
}

export async function getSharedExercisesByDay(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanReadAccess(dailyPlanId, user.id);

  return db
    .select()
    .from(exercises)
    .where(eq(exercises.dailyPlanId, dailyPlanId))
    .orderBy(asc(exercises.sortOrder));
}

export async function getSharedSupplementsByWeek(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanReadAccess(weeklyPlanId, user.id);

  return db
    .select()
    .from(supplements)
    .where(eq(supplements.weeklyPlanId, weeklyPlanId));
}

export async function getSharedShoppingList(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanReadAccess(weeklyPlanId, user.id);

  return db
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.weeklyPlanId, weeklyPlanId))
    .orderBy(asc(shoppingLists.sortOrder));
}
