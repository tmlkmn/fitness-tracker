import { db } from "@/db";
import {
  dailyPlans,
  weeklyPlans,
  meals,
  exercises,
  shoppingLists,
  shares,
} from "@/db/schema";
import { eq, and, or, isNotNull } from "drizzle-orm";
import { isWeekPast } from "@/lib/utils";

export async function verifyWeeklyPlanOwnership(
  weeklyPlanId: number,
  userId: string
) {
  const rows = await db
    .select({ id: weeklyPlans.id })
    .from(weeklyPlans)
    .where(
      and(eq(weeklyPlans.id, weeklyPlanId), eq(weeklyPlans.userId, userId))
    );
  if (rows.length === 0) throw new Error("Unauthorized");
}

export async function verifyDailyPlanOwnership(
  dailyPlanId: number,
  userId: string
) {
  const rows = await db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(eq(dailyPlans.id, dailyPlanId), eq(weeklyPlans.userId, userId))
    );
  if (rows.length === 0) throw new Error("Unauthorized");
}

export async function verifyMealOwnership(mealId: number, userId: string) {
  const rows = await db
    .select({ id: meals.id })
    .from(meals)
    .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(and(eq(meals.id, mealId), eq(weeklyPlans.userId, userId)));
  if (rows.length === 0) throw new Error("Unauthorized");
}

export async function verifyExerciseOwnership(
  exerciseId: number,
  userId: string
) {
  const rows = await db
    .select({ id: exercises.id })
    .from(exercises)
    .innerJoin(dailyPlans, eq(exercises.dailyPlanId, dailyPlans.id))
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(and(eq(exercises.id, exerciseId), eq(weeklyPlans.userId, userId)));
  if (rows.length === 0) throw new Error("Unauthorized");
}

export async function verifyShoppingItemOwnership(
  itemId: number,
  userId: string
) {
  const rows = await db
    .select({ id: shoppingLists.id })
    .from(shoppingLists)
    .innerJoin(weeklyPlans, eq(shoppingLists.weeklyPlanId, weeklyPlans.id))
    .where(and(eq(shoppingLists.id, itemId), eq(weeklyPlans.userId, userId)));
  if (rows.length === 0) throw new Error("Unauthorized");
}

export async function verifyWeeklyPlanReadAccess(
  weeklyPlanId: number,
  userId: string
) {
  const rows = await db
    .select({
      id: weeklyPlans.id,
      ownerUserId: weeklyPlans.userId,
      startDate: weeklyPlans.startDate,
      isShared: shares.id,
    })
    .from(weeklyPlans)
    .leftJoin(
      shares,
      and(
        eq(shares.weeklyPlanId, weeklyPlans.id),
        eq(shares.sharedWithUserId, userId)
      )
    )
    .where(
      and(
        eq(weeklyPlans.id, weeklyPlanId),
        or(eq(weeklyPlans.userId, userId), isNotNull(shares.id))
      )
    );
  if (rows.length === 0) throw new Error("Unauthorized");

  const row = rows[0];
  // Recipient (non-owner): block past weeks
  if (row.ownerUserId !== userId && row.startDate && isWeekPast(row.startDate)) {
    throw new Error("Unauthorized");
  }
}

export async function verifyDailyPlanReadAccess(
  dailyPlanId: number,
  userId: string
) {
  const rows = await db
    .select({
      id: dailyPlans.id,
      ownerUserId: weeklyPlans.userId,
      startDate: weeklyPlans.startDate,
      isShared: shares.id,
    })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .leftJoin(
      shares,
      and(
        eq(shares.weeklyPlanId, weeklyPlans.id),
        eq(shares.sharedWithUserId, userId)
      )
    )
    .where(
      and(
        eq(dailyPlans.id, dailyPlanId),
        or(eq(weeklyPlans.userId, userId), isNotNull(shares.id))
      )
    );
  if (rows.length === 0) throw new Error("Unauthorized");

  const row = rows[0];
  if (row.ownerUserId !== userId && row.startDate && isWeekPast(row.startDate)) {
    throw new Error("Unauthorized");
  }
}
