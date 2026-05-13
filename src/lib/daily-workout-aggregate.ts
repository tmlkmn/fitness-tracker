/**
 * Builds a synthetic weekly plan from a single-day workout AI suggestion plus
 * the other 6 days already on the user's current week. Used to bring the
 * daily workout regenerate flow to parity with the weekly validators —
 * muscle volume bands and per-muscle/per-pattern progressive overload
 * meaningfully measure weekly aggregates, not isolated days, so we
 * reconstruct the weekly shape that would exist *if* the user applied the
 * suggestion as-is.
 *
 * No persistence here. The synthetic plan flows through the same validators
 * the weekly flow uses and any warnings get relayed to the suggestion modal.
 */
import "server-only";
import { db } from "@/db";
import { dailyPlans, exercises } from "@/db/schema";
import { and, eq, ne, inArray, asc } from "drizzle-orm";
import type {
  AIWeeklyDay,
  AIWeeklyPlan,
  AIExerciseItem,
} from "@/lib/ai-weekly-types";
import type { AIExercise } from "@/actions/ai-workout";

export interface DailyAggregateContext {
  /** Synthetic plan that mirrors the user's current week with the new day swapped in. */
  plan: AIWeeklyPlan;
  /** The weeklyPlanId of the daily plan being regenerated (null when free-standing). */
  weeklyPlanId: number | null;
  /** Day-of-week being regenerated (0=Mon … 6=Sun). */
  dayOfWeek: number;
  /** Workout/swimming day count across the synthetic week. */
  trainingDayCount: number;
}

/**
 * Pull the daily plan's weekly context and reshape it as an AIWeeklyPlan.
 * Returns null when the daily plan has no parent weekly plan (free-standing
 * day) — caller should skip aggregate validation in that case.
 */
export async function buildWeeklyAggregateForDailyValidation(
  dailyPlanId: number,
  newExercises: AIExercise[],
): Promise<DailyAggregateContext | null> {
  const [currentDay] = await db
    .select({
      id: dailyPlans.id,
      weeklyPlanId: dailyPlans.weeklyPlanId,
      dayOfWeek: dailyPlans.dayOfWeek,
      dayName: dailyPlans.dayName,
      planType: dailyPlans.planType,
      workoutTitle: dailyPlans.workoutTitle,
    })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));
  if (!currentDay || currentDay.weeklyPlanId == null) return null;

  const otherDays = await db
    .select({
      id: dailyPlans.id,
      dayOfWeek: dailyPlans.dayOfWeek,
      dayName: dailyPlans.dayName,
      planType: dailyPlans.planType,
      workoutTitle: dailyPlans.workoutTitle,
    })
    .from(dailyPlans)
    .where(
      and(
        eq(dailyPlans.weeklyPlanId, currentDay.weeklyPlanId),
        ne(dailyPlans.id, dailyPlanId),
      ),
    );

  const otherDayIds = otherDays.map((d) => d.id);
  const otherDayExercises = otherDayIds.length
    ? await db
        .select({
          dailyPlanId: exercises.dailyPlanId,
          section: exercises.section,
          sectionLabel: exercises.sectionLabel,
          name: exercises.name,
          englishName: exercises.englishName,
          sets: exercises.sets,
          reps: exercises.reps,
          restSeconds: exercises.restSeconds,
          durationMinutes: exercises.durationMinutes,
          notes: exercises.notes,
          intensity: exercises.intensity,
        })
        .from(exercises)
        .where(inArray(exercises.dailyPlanId, otherDayIds))
        .orderBy(asc(exercises.sortOrder))
    : [];

  const exByDay = new Map<number, AIExerciseItem[]>();
  for (const ex of otherDayExercises) {
    if (ex.dailyPlanId == null) continue;
    const arr = exByDay.get(ex.dailyPlanId) ?? [];
    arr.push({
      section: ex.section,
      sectionLabel: ex.sectionLabel,
      name: ex.name,
      englishName: ex.englishName,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.restSeconds,
      durationMinutes: ex.durationMinutes,
      notes: ex.notes,
      intensity: coerceIntensity(ex.intensity),
    });
    exByDay.set(ex.dailyPlanId, arr);
  }

  const days: AIWeeklyDay[] = [];
  for (const d of otherDays) {
    if (d.dayOfWeek == null) continue;
    days.push({
      dayOfWeek: d.dayOfWeek,
      dayName: d.dayName ?? "",
      planType: d.planType ?? "rest",
      workoutTitle: d.workoutTitle,
      meals: [],
      exercises: exByDay.get(d.id) ?? [],
    });
  }

  // Replace (or insert) the current day with the new AI suggestion. We carry
  // the original planType / workoutTitle so validators that key off planType
  // (e.g. swimming-only sections) still see the right shape.
  days.push({
    dayOfWeek: currentDay.dayOfWeek ?? 0,
    dayName: currentDay.dayName ?? "",
    planType: currentDay.planType ?? "workout",
    workoutTitle: currentDay.workoutTitle,
    meals: [],
    exercises: newExercises.map(toAIExerciseItem),
  });
  days.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const trainingDayCount = days.filter(
    (d) => d.planType === "workout" || d.planType === "swimming",
  ).length;

  const plan: AIWeeklyPlan = {
    weekTitle: "Daily-aggregate-synthetic",
    phase: "daily",
    notes: null,
    days,
  };
  return {
    plan,
    weeklyPlanId: currentDay.weeklyPlanId,
    dayOfWeek: currentDay.dayOfWeek ?? 0,
    trainingDayCount,
  };
}

function coerceIntensity(value: string | null): "low" | "moderate" | "high" | null {
  if (value === "low" || value === "moderate" || value === "high") return value;
  return null;
}

function toAIExerciseItem(ex: AIExercise): AIExerciseItem {
  return {
    section: ex.section,
    sectionLabel: ex.sectionLabel,
    name: ex.name,
    englishName: ex.englishName,
    sets: ex.sets,
    reps: ex.reps,
    restSeconds: ex.restSeconds,
    durationMinutes: ex.durationMinutes,
    notes: ex.notes,
    intensity: coerceIntensity(ex.intensity ?? null),
  };
}
