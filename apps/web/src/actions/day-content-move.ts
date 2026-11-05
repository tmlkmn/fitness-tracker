"use server";

import { db } from "@/db";
import { dailyPlans, exercises, meals } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { verifyDailyPlanOwnership } from "@/lib/ownership";

export type MoveMode = "move" | "swap" | "replace";

export interface MoveDayContentsInput {
  sourceDailyPlanId: number;
  targetDailyPlanId: number;
  mode: MoveMode;
  includeWorkout: boolean;
  includeMeals: boolean;
}

export interface MoveDayContentsResult {
  movedExerciseCount: number;
  movedMealCount: number;
  deletedExerciseCount: number;
  deletedMealCount: number;
  sourceLabel: string;
  targetLabel: string;
  mode: MoveMode;
}

function formatDayLabel(plan: { dayName: string; date: string | null }): string {
  if (!plan.date) return plan.dayName;
  const [, m, d] = plan.date.split("-");
  return `${plan.dayName} ${parseInt(d, 10)}.${parseInt(m, 10)}`;
}

export async function moveDayContents(
  input: MoveDayContentsInput,
): Promise<MoveDayContentsResult> {
  const {
    sourceDailyPlanId,
    targetDailyPlanId,
    mode,
    includeWorkout,
    includeMeals,
  } = input;

  if (sourceDailyPlanId === targetDailyPlanId) {
    throw new Error("Kaynak ve hedef gün aynı olamaz");
  }
  if (!includeWorkout && !includeMeals) {
    throw new Error("En az antrenman ya da beslenme seçilmeli");
  }

  const user = await getAuthUser();
  await verifyDailyPlanOwnership(sourceDailyPlanId, user.id);
  await verifyDailyPlanOwnership(targetDailyPlanId, user.id);

  const [source] = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.id, sourceDailyPlanId));
  const [target] = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.id, targetDailyPlanId));

  if (!source || !target) throw new Error("Gün bulunamadı");
  if (source.weeklyPlanId !== target.weeklyPlanId) {
    throw new Error("Sadece aynı hafta içinde taşıma yapılabilir");
  }

  const sourceExerciseIds = includeWorkout
    ? (
        await db
          .select({ id: exercises.id })
          .from(exercises)
          .where(eq(exercises.dailyPlanId, sourceDailyPlanId))
      ).map((e) => e.id)
    : [];
  const targetExerciseIds = includeWorkout
    ? (
        await db
          .select({ id: exercises.id })
          .from(exercises)
          .where(eq(exercises.dailyPlanId, targetDailyPlanId))
      ).map((e) => e.id)
    : [];
  const sourceMealIds = includeMeals
    ? (
        await db
          .select({ id: meals.id })
          .from(meals)
          .where(eq(meals.dailyPlanId, sourceDailyPlanId))
      ).map((m) => m.id)
    : [];
  const targetMealIds = includeMeals
    ? (
        await db
          .select({ id: meals.id })
          .from(meals)
          .where(eq(meals.dailyPlanId, targetDailyPlanId))
      ).map((m) => m.id)
    : [];

  let movedExerciseCount = 0;
  let movedMealCount = 0;
  let deletedExerciseCount = 0;
  let deletedMealCount = 0;

  if (mode === "swap") {
    // Swap: ID listeleri ayrıştırdığı için iki UPDATE çakışmaz
    if (includeWorkout) {
      if (sourceExerciseIds.length > 0) {
        await db
          .update(exercises)
          .set({ dailyPlanId: targetDailyPlanId, isCompleted: false })
          .where(inArray(exercises.id, sourceExerciseIds));
        movedExerciseCount += sourceExerciseIds.length;
      }
      if (targetExerciseIds.length > 0) {
        await db
          .update(exercises)
          .set({ dailyPlanId: sourceDailyPlanId, isCompleted: false })
          .where(inArray(exercises.id, targetExerciseIds));
        movedExerciseCount += targetExerciseIds.length;
      }
      await db
        .update(dailyPlans)
        .set({ planType: target.planType, workoutTitle: target.workoutTitle })
        .where(eq(dailyPlans.id, sourceDailyPlanId));
      await db
        .update(dailyPlans)
        .set({ planType: source.planType, workoutTitle: source.workoutTitle })
        .where(eq(dailyPlans.id, targetDailyPlanId));
    }
    if (includeMeals) {
      if (sourceMealIds.length > 0) {
        await db
          .update(meals)
          .set({ dailyPlanId: targetDailyPlanId, isCompleted: false })
          .where(inArray(meals.id, sourceMealIds));
        movedMealCount += sourceMealIds.length;
      }
      if (targetMealIds.length > 0) {
        await db
          .update(meals)
          .set({ dailyPlanId: sourceDailyPlanId, isCompleted: false })
          .where(inArray(meals.id, targetMealIds));
        movedMealCount += targetMealIds.length;
      }
    }
  } else {
    // move (target=rest) ve replace (target=workout) — ikisi de aynı yön
    // Önce kaynak satırları hedefe taşı, sonra hedefin orijinal satırlarını sil
    // (Bu sıra parça başarısızlığında veri kaybını engeller — kötü durumda hedefte
    //  birleşmiş satır olur, kayıp olmaz)

    // Adım 1: kaynak satırları hedefe taşı (henüz silme yok)
    if (includeWorkout && sourceExerciseIds.length > 0) {
      await db
        .update(exercises)
        .set({ dailyPlanId: targetDailyPlanId, isCompleted: false })
        .where(inArray(exercises.id, sourceExerciseIds));
      movedExerciseCount = sourceExerciseIds.length;
    }
    if (includeMeals && sourceMealIds.length > 0) {
      await db
        .update(meals)
        .set({ dailyPlanId: targetDailyPlanId, isCompleted: false })
        .where(inArray(meals.id, sourceMealIds));
      movedMealCount = sourceMealIds.length;
    }

    // Adım 2: hedefin orijinal satırlarını sil
    if (includeWorkout && targetExerciseIds.length > 0) {
      await db
        .delete(exercises)
        .where(inArray(exercises.id, targetExerciseIds));
      deletedExerciseCount = targetExerciseIds.length;
    }
    if (includeMeals && targetMealIds.length > 0) {
      await db.delete(meals).where(inArray(meals.id, targetMealIds));
      deletedMealCount = targetMealIds.length;
    }

    // Adım 3: dailyPlans.planType + workoutTitle güncelle (sadece workout taşınıyorsa)
    if (includeWorkout) {
      await db
        .update(dailyPlans)
        .set({ planType: source.planType, workoutTitle: source.workoutTitle })
        .where(eq(dailyPlans.id, targetDailyPlanId));
      await db
        .update(dailyPlans)
        .set({ planType: "rest", workoutTitle: null })
        .where(eq(dailyPlans.id, sourceDailyPlanId));
    }
  }

  // Only revalidate server-component routes; client routes (/,/takvim,/ogunlerim) are
  // handled by React Query invalidation in useMoveDayContents onSettled.
  revalidatePath(`/gun/${sourceDailyPlanId}`);
  revalidatePath(`/gun/${targetDailyPlanId}`);

  return {
    movedExerciseCount,
    movedMealCount,
    deletedExerciseCount,
    deletedMealCount,
    sourceLabel: formatDayLabel(source),
    targetLabel: formatDayLabel(target),
    mode,
  };
}
