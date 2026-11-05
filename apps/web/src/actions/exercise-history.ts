"use server";

import { db } from "@/db";
import { exercises, dailyPlans, weeklyPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { verifyDailyPlanOwnership } from "@/lib/ownership";

export async function getExercisesFromPreviousWeek(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  // Get current dailyPlan's dayOfWeek and weeklyPlanId
  const [currentDay] = await db
    .select({
      dayOfWeek: dailyPlans.dayOfWeek,
      weeklyPlanId: dailyPlans.weeklyPlanId,
    })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));

  if (!currentDay?.weeklyPlanId) return [];

  // Get current weekly plan's weekNumber
  const [currentWeek] = await db
    .select({
      weekNumber: weeklyPlans.weekNumber,
    })
    .from(weeklyPlans)
    .where(eq(weeklyPlans.id, currentDay.weeklyPlanId));

  if (!currentWeek) return [];

  // Find previous weekly plan (weekNumber - 1, same user)
  const [prevWeek] = await db
    .select({ id: weeklyPlans.id })
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        eq(weeklyPlans.weekNumber, currentWeek.weekNumber - 1),
      ),
    );

  if (!prevWeek) return [];

  // Find same dayOfWeek in previous week
  const [prevDay] = await db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .where(
      and(
        eq(dailyPlans.weeklyPlanId, prevWeek.id),
        eq(dailyPlans.dayOfWeek, currentDay.dayOfWeek),
      ),
    );

  if (!prevDay) return [];

  // Get exercises from that day
  const prevExercises = await db
    .select({
      section: exercises.section,
      sectionLabel: exercises.sectionLabel,
      name: exercises.name,
      sets: exercises.sets,
      reps: exercises.reps,
      restSeconds: exercises.restSeconds,
      durationMinutes: exercises.durationMinutes,
      notes: exercises.notes,
    })
    .from(exercises)
    .where(eq(exercises.dailyPlanId, prevDay.id))
    .orderBy(exercises.sortOrder);

  return prevExercises;
}
