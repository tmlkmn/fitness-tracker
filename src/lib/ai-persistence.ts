/**
 * Server-only persistence helpers for AI-driven content replacement.
 *
 * These wrap the delete-then-insert pattern used by daily/weekly/section
 * apply flows. They preserve the existing **non-atomic** semantics — wrapping
 * in `db.transaction()` is a future enhancement. Helpers exist purely to
 * de-duplicate the ~5 copies of these blocks across actions.
 */

import "server-only";
import { db } from "@/db";
import { meals, exercises } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { AIMeal } from "@/actions/ai-meals";
import type { AIExercise } from "@/actions/ai-workout";
import { coerceMealLabel } from "@/lib/meal-labels";
import { getSectionSortOffset } from "@/lib/ai-config";

/**
 * Maps an AIMeal array to the DB insert shape for a given dailyPlanId.
 * Pure transformation — no DB calls.
 */
function mealsToInsertValues(dailyPlanId: number, list: AIMeal[]) {
  return list.map((m, i) => ({
    dailyPlanId,
    mealTime: m.mealTime,
    mealLabel: coerceMealLabel(m.mealLabel),
    content: m.content,
    calories: m.calories,
    proteinG: m.proteinG,
    carbsG: m.carbsG,
    fatG: m.fatG,
    isCompleted: false,
    sortOrder: i,
  }));
}

/**
 * Maps an AIExercise array to the DB insert shape. When `sortOffset` is
 * provided (section replacement), it's added to each row's `sortOrder` so
 * inserted items stack after their predecessors in the section ordering.
 */
function exercisesToInsertValues(
  dailyPlanId: number,
  list: AIExercise[],
  sortOffset: number = 0,
) {
  return list.map((ex, i) => ({
    dailyPlanId,
    section: ex.section,
    sectionLabel: ex.sectionLabel,
    name: ex.name,
    englishName: ex.englishName,
    sets: ex.sets,
    reps: ex.reps,
    restSeconds: ex.restSeconds,
    durationMinutes: ex.durationMinutes,
    notes: ex.notes,
    isCompleted: false,
    sortOrder: sortOffset + i,
  }));
}

/** Insert meals without deleting anything first. Used by weekly insert paths. */
export async function insertMealsForDay(dailyPlanId: number, list: AIMeal[]): Promise<void> {
  if (list.length === 0) return;
  await db.insert(meals).values(mealsToInsertValues(dailyPlanId, list));
}

/** Insert exercises without deleting anything first. Used by weekly insert paths. */
export async function insertExercisesForDay(dailyPlanId: number, list: AIExercise[]): Promise<void> {
  if (list.length === 0) return;
  await db.insert(exercises).values(exercisesToInsertValues(dailyPlanId, list));
}

/** Delete all meals for `dailyPlanId`, then insert `newMeals`. Non-atomic. */
export async function replaceMealsForDay(dailyPlanId: number, newMeals: AIMeal[]): Promise<void> {
  await db.delete(meals).where(eq(meals.dailyPlanId, dailyPlanId));
  await insertMealsForDay(dailyPlanId, newMeals);
}

/** Delete all exercises for `dailyPlanId`, then insert `newExercises`. Non-atomic. */
export async function replaceExercisesForDay(
  dailyPlanId: number,
  newExercises: AIExercise[],
): Promise<void> {
  await db.delete(exercises).where(eq(exercises.dailyPlanId, dailyPlanId));
  await insertExercisesForDay(dailyPlanId, newExercises);
}

/**
 * Delete exercises in `section` for `dailyPlanId`, then insert `newExercises`
 * with the section's canonical sort offset (so different sections stay
 * ordered: warmup < main < cooldown < ...).
 */
export async function replaceSectionExercises(
  dailyPlanId: number,
  section: string,
  newExercises: AIExercise[],
): Promise<void> {
  await db
    .delete(exercises)
    .where(
      and(eq(exercises.dailyPlanId, dailyPlanId), eq(exercises.section, section)),
    );
  if (newExercises.length === 0) return;
  const sortOffset = getSectionSortOffset(section);
  await db.insert(exercises).values(
    exercisesToInsertValues(dailyPlanId, newExercises, sortOffset),
  );
}
