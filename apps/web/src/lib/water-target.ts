import { db } from "@/db";
import { users, dailyPlans, weeklyPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const ML_PER_KG_BASE = 30; // base hydration: 30ml × bodyweight kg
const ML_PER_GLASS = 250;
const WORKOUT_DAY_BONUS_GLASSES = 2; // workout / swimming day → +2 glasses
const GOAL_BONUS_GLASSES: Record<string, number> = {
  loss: 1,         // higher water aids satiety + fat loss
  muscle_gain: 1,  // recovery + protein metabolism
  weight_gain: 1,
};
const MIN_GLASSES = 6;  // 1.5L floor
const MAX_GLASSES = 14; // 3.5L ceiling
const DEFAULT_GLASSES = 8;

/**
 * Computes a personalized daily water target (in 250ml glasses) for the user
 * on a given date. Based on bodyweight, plan type for that day (workout/swim
 * gets +2 glasses), and fitness goal (loss / muscle_gain / weight_gain bump).
 * Falls back to 8 glasses when bodyweight is unknown.
 */
export async function computeWaterTarget(
  userId: string,
  dateStr: string,
): Promise<number> {
  const [u] = await db
    .select({
      weight: users.weight,
      fitnessGoal: users.fitnessGoal,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!u) return DEFAULT_GLASSES;

  const weightKg = u.weight ? parseFloat(u.weight) : null;
  if (!weightKg || Number.isNaN(weightKg)) return DEFAULT_GLASSES;

  // Base: 30ml × kg → glasses, rounded up
  let glasses = Math.ceil((weightKg * ML_PER_KG_BASE) / ML_PER_GLASS);

  // Plan-type bump: only adds bonus for workout/swimming days
  const [day] = await db
    .select({ planType: dailyPlans.planType })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, userId),
        eq(dailyPlans.date, dateStr),
      ),
    );

  if (day?.planType === "workout" || day?.planType === "swimming") {
    glasses += WORKOUT_DAY_BONUS_GLASSES;
  }

  // Goal bump
  if (u.fitnessGoal && GOAL_BONUS_GLASSES[u.fitnessGoal]) {
    glasses += GOAL_BONUS_GLASSES[u.fitnessGoal];
  }

  return Math.max(MIN_GLASSES, Math.min(MAX_GLASSES, glasses));
}
