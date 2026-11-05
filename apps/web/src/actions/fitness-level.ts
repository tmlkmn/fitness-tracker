"use server";

import { db } from "@/db";
import { users, weeklyPlans, dailyPlans, exercises } from "@/db/schema";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { getTurkeyTodayStr } from "@/lib/utils";
import {
  coerceFitnessLevel,
  suggestFitnessLevel,
  type FitnessLevelSuggestion,
} from "@/lib/fitness-level-suggester";

const LOOKBACK_WEEKS = 6;
const COMPLETION_WORKING_SECTIONS = ["main", "swimming"] as const;

function isoDaysAgo(baseStr: string, days: number): string {
  const [y, mo, d] = baseStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function diffDays(fromStr: string, toStr: string): number {
  const [fy, fmo, fd] = fromStr.split("-").map(Number);
  const [ty, tmo, td] = toStr.split("-").map(Number);
  const from = Date.UTC(fy, fmo - 1, fd);
  const to = Date.UTC(ty, tmo - 1, td);
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

/**
 * Evaluate the user's declared fitness level against signals from their plan
 * history. Returns the upgrade suggestion (or null when no nudge applies —
 * either data is insufficient, declared matches, or declared is already
 * "advanced"). See `suggestFitnessLevel` for the threshold table.
 */
export async function getFitnessLevelSuggestion(): Promise<FitnessLevelSuggestion | null> {
  const session = await getAuthUser();
  const userId = session.id;

  const [userRow] = await db
    .select({ fitnessLevel: users.fitnessLevel, serviceType: users.serviceType })
    .from(users)
    .where(eq(users.id, userId));

  if (!userRow) return null;
  // Nutrition-only users don't use fitnessLevel — no suggestion to show.
  if (userRow.serviceType === "nutrition") return null;

  const declared = coerceFitnessLevel(userRow.fitnessLevel);
  if (declared == null) return null;

  const today = getTurkeyTodayStr();
  const lookbackStart = isoDaysAgo(today, LOOKBACK_WEEKS * 7);

  // History: oldest weekly plan startDate → weeks elapsed.
  const [earliest] = await db
    .select({ startDate: weeklyPlans.startDate })
    .from(weeklyPlans)
    .where(eq(weeklyPlans.userId, userId))
    .orderBy(asc(weeklyPlans.startDate))
    .limit(1);

  const historyDays = earliest?.startDate
    ? diffDays(earliest.startDate, today)
    : 0;
  const historyWeeks = Math.floor(historyDays / 7);

  // Last 6 weeks of plans — used for completion + avg working sets.
  const recentPlans = await db
    .select({ id: weeklyPlans.id })
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.userId, userId),
        gte(weeklyPlans.startDate, lookbackStart),
      ),
    );
  const recentPlanIds = recentPlans.map((p) => p.id);

  let completionRate: number | null = null;
  let avgWeeklySets: number | null = null;

  if (recentPlanIds.length > 0) {
    const exerciseRows = await db
      .select({
        weeklyPlanId: dailyPlans.weeklyPlanId,
        section: exercises.section,
        sets: exercises.sets,
        isCompleted: exercises.isCompleted,
      })
      .from(exercises)
      .innerJoin(dailyPlans, eq(exercises.dailyPlanId, dailyPlans.id))
      .where(inArray(dailyPlans.weeklyPlanId, recentPlanIds));

    if (exerciseRows.length > 0) {
      const completed = exerciseRows.filter((e) => e.isCompleted === true).length;
      completionRate = completed / exerciseRows.length;

      const setsByPlan = new Map<number, number>();
      for (const ex of exerciseRows) {
        if (!ex.weeklyPlanId) continue;
        if (!(COMPLETION_WORKING_SECTIONS as readonly string[]).includes(ex.section)) {
          continue;
        }
        const add = ex.sets ?? 1;
        setsByPlan.set(ex.weeklyPlanId, (setsByPlan.get(ex.weeklyPlanId) ?? 0) + add);
      }
      if (setsByPlan.size > 0) {
        const total = Array.from(setsByPlan.values()).reduce((s, n) => s + n, 0);
        avgWeeklySets = total / setsByPlan.size;
      }
    }
  }

  return suggestFitnessLevel({
    declared,
    metrics: { historyWeeks, completionRate, avgWeeklySets },
  });
}
