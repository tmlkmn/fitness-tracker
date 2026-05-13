"use server";

import { db } from "@/db";
import {
  users,
  weeklyPlans,
  dailyPlans,
  exercises,
  sleepLogs,
} from "@/db/schema";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { getMondayStr } from "@/lib/utils";
import {
  evaluateDeloadCandidacy,
  type DeloadRecommendation,
} from "@/lib/deload-policy";

const RECENT_PHASES_LIMIT = 6;
const SLEEP_LOOKBACK_DAYS = 7;

function daysAgoStr(baseStr: string, days: number): string {
  const [y, mo, d] = baseStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCDate(dt.getUTCDate() - days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Evaluates whether a deload week is appropriate for the given Monday.
 *
 * Reads `users.fitnessLevel`, recent `weeklyPlans` (newest 6 strictly
 * before this Monday), last 7 `sleepLogs`, and the previous weekly plan's
 * exercise completion rate. Returns a `DeloadRecommendation` describing
 * whether (and why) to suggest a deload.
 */
export async function getDeloadRecommendation(
  dateStr: string,
): Promise<DeloadRecommendation> {
  const session = await getAuthUser();
  const userId = session.id;
  const monday = getMondayStr(dateStr);
  const sleepFloor = daysAgoStr(monday, SLEEP_LOOKBACK_DAYS);

  const [userRow, recentPlans, recentSleep] = await Promise.all([
    db
      .select({ fitnessLevel: users.fitnessLevel })
      .from(users)
      .where(eq(users.id, userId))
      .then((r) => r[0]),
    db
      .select({
        id: weeklyPlans.id,
        weekNumber: weeklyPlans.weekNumber,
        phase: weeklyPlans.phase,
        startDate: weeklyPlans.startDate,
      })
      .from(weeklyPlans)
      .where(and(eq(weeklyPlans.userId, userId), lt(weeklyPlans.startDate, monday)))
      .orderBy(desc(weeklyPlans.startDate))
      .limit(RECENT_PHASES_LIMIT),
    db
      .select({
        quality: sleepLogs.quality,
        durationMinutes: sleepLogs.durationMinutes,
      })
      .from(sleepLogs)
      .where(
        and(
          eq(sleepLogs.userId, userId),
          gte(sleepLogs.logDate, sleepFloor),
          lt(sleepLogs.logDate, monday),
        ),
      ),
  ]);

  const fitnessLevel = userRow?.fitnessLevel ?? null;
  const weekNumber = (recentPlans[0]?.weekNumber ?? 0) + 1;
  const recentPhases = recentPlans
    .filter((p) => p.startDate != null)
    .map((p) => ({
      weekNumber: p.weekNumber,
      phase: p.phase,
      startDate: p.startDate as string,
    }));

  let lastWeekCompletionRate: number | null = null;
  const previousPlanId = recentPlans[0]?.id ?? null;
  if (previousPlanId != null) {
    const exerciseRows = await db
      .select({ isCompleted: exercises.isCompleted })
      .from(exercises)
      .innerJoin(dailyPlans, eq(exercises.dailyPlanId, dailyPlans.id))
      .where(eq(dailyPlans.weeklyPlanId, previousPlanId));
    if (exerciseRows.length > 0) {
      const completed = exerciseRows.filter((e) => e.isCompleted === true).length;
      lastWeekCompletionRate = completed / exerciseRows.length;
    }
  }

  const sleepSamples = recentSleep.length;
  const qualitySamples = recentSleep.filter((s) => s.quality != null);
  const durationSamples = recentSleep.filter((s) => s.durationMinutes != null);
  const qualityAvg = qualitySamples.length > 0
    ? qualitySamples.reduce((sum, s) => sum + (s.quality as number), 0) / qualitySamples.length
    : null;
  const durationAvg = durationSamples.length > 0
    ? durationSamples.reduce((sum, s) => sum + (s.durationMinutes as number), 0) / durationSamples.length
    : null;

  return evaluateDeloadCandidacy({
    fitnessLevel,
    weekNumber,
    recentPhases,
    sleep7d: { qualityAvg, durationAvg, samples: sleepSamples },
    lastWeekCompletionRate,
  });
}
