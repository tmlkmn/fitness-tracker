"use server";

import { db } from "@/db";
import {
  readinessLogs,
  sleepLogs,
  waterLogs,
  meals,
  exercises,
  dailyPlans,
  weeklyPlans,
} from "@/db/schema";
import { and, eq, gte, lte, sql, desc, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import {
  computeReadinessScore,
  type ReadinessInput,
  type ReadinessResult,
} from "@/lib/readiness-policy";
import { getTurkeyTodayStr, addDaysStr } from "@/lib/utils";

const DAY_MS = 86_400_000;

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ReadinessLogRow {
  logDate: string;
  energyRating: number | null;
  painScore: number | null;
  notes: string | null;
  updatedAt: Date;
}

function rowToLog(row: typeof readinessLogs.$inferSelect): ReadinessLogRow {
  return {
    logDate: row.logDate as string,
    energyRating: row.energyRating,
    painScore: row.painScore,
    notes: row.notes,
    updatedAt: row.updatedAt,
  };
}

export async function getReadinessLog(
  dateStr: string,
): Promise<ReadinessLogRow | null> {
  const user = await getAuthUser();
  const [row] = await db
    .select()
    .from(readinessLogs)
    .where(
      and(
        eq(readinessLogs.userId, user.id),
        eq(readinessLogs.logDate, dateStr),
      ),
    );
  return row ? rowToLog(row) : null;
}

export async function getTodayReadinessLog(): Promise<ReadinessLogRow | null> {
  return getReadinessLog(getTurkeyTodayStr());
}

export async function getReadinessLogs(limit = 14): Promise<ReadinessLogRow[]> {
  const user = await getAuthUser();
  const rows = await db
    .select()
    .from(readinessLogs)
    .where(eq(readinessLogs.userId, user.id))
    .orderBy(desc(readinessLogs.logDate))
    .limit(limit);
  return rows.map(rowToLog);
}

export async function upsertReadinessLog(input: {
  logDate?: string;
  energyRating: number | null;
  painScore: number | null;
  notes?: string | null;
}): Promise<{ success: true }> {
  const user = await getAuthUser();
  const logDate = input.logDate ?? getTurkeyTodayStr();

  if (
    input.energyRating != null &&
    (input.energyRating < 1 || input.energyRating > 5)
  ) {
    throw new Error("Invalid energy rating");
  }
  if (input.painScore != null && (input.painScore < 1 || input.painScore > 5)) {
    throw new Error("Invalid pain score");
  }

  const notes = input.notes?.trim().slice(0, 200) || null;

  await db
    .insert(readinessLogs)
    .values({
      userId: user.id,
      logDate,
      energyRating: input.energyRating,
      painScore: input.painScore,
      notes,
    })
    .onConflictDoUpdate({
      target: [readinessLogs.userId, readinessLogs.logDate],
      set: {
        energyRating: input.energyRating,
        painScore: input.painScore,
        notes,
        updatedAt: new Date(),
      },
    });

  return { success: true };
}

export async function deleteReadinessLog(dateStr: string): Promise<void> {
  const user = await getAuthUser();
  await db
    .delete(readinessLogs)
    .where(
      and(
        eq(readinessLogs.userId, user.id),
        eq(readinessLogs.logDate, dateStr),
      ),
    );
}

// ─── Compute pipeline ───

async function fetchSleep24h(
  userId: string,
): Promise<{ durationMinutes: number | null; quality: number | null } | null> {
  const since = new Date(Date.now() - DAY_MS);
  const sinceStr = isoDate(since);
  const [row] = await db
    .select({
      durationMinutes: sleepLogs.durationMinutes,
      quality: sleepLogs.quality,
    })
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.logDate, sinceStr)))
    .orderBy(desc(sleepLogs.logDate))
    .limit(1);
  return row ?? null;
}

async function fetchWaterYesterday(
  userId: string,
  yesterdayStr: string,
): Promise<{ glasses: number; targetGlasses: number } | null> {
  const [row] = await db
    .select({
      glasses: waterLogs.glasses,
      targetGlasses: waterLogs.targetGlasses,
    })
    .from(waterLogs)
    .where(
      and(eq(waterLogs.userId, userId), eq(waterLogs.logDate, yesterdayStr)),
    );
  return row ?? null;
}

async function fetchComplianceYesterday(
  userId: string,
  yesterdayStr: string,
): Promise<{ ratio: number | null; wasRest: boolean; hadPlan: boolean }> {
  // First find the dailyPlan(s) for yesterday — there can be 0..n (often 1).
  const plans = await db
    .select({
      id: dailyPlans.id,
      planType: dailyPlans.planType,
    })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(weeklyPlans.id, dailyPlans.weeklyPlanId))
    .where(
      and(
        eq(weeklyPlans.userId, userId),
        eq(dailyPlans.date, yesterdayStr),
      ),
    );

  if (plans.length === 0) {
    return { ratio: null, wasRest: false, hadPlan: false };
  }

  const wasRest = plans.every((p) => p.planType === "rest");
  if (wasRest) {
    return { ratio: null, wasRest: true, hadPlan: true };
  }

  const planIds = plans.map((p) => p.id);
  const [mealAgg] = await db
    .select({
      done: sql<number>`count(*) filter (where ${meals.isCompleted})::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(meals)
    .where(inArray(meals.dailyPlanId, planIds));
  const [exerciseAgg] = await db
    .select({
      done: sql<number>`count(*) filter (where ${exercises.isCompleted})::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(exercises)
    .where(inArray(exercises.dailyPlanId, planIds));

  const totalItems = (mealAgg?.total ?? 0) + (exerciseAgg?.total ?? 0);
  if (totalItems === 0) {
    return { ratio: null, wasRest: false, hadPlan: true };
  }
  const doneItems = (mealAgg?.done ?? 0) + (exerciseAgg?.done ?? 0);
  return {
    ratio: doneItems / totalItems,
    wasRest: false,
    hadPlan: true,
  };
}

function sleepProxyPoints(d: {
  durationMinutes: number | null;
  quality: number | null;
}): number {
  // Lightweight proxy for trend math. Mirrors scoreSleep() shape but
  // kept local so trend can score sleep-only days without round-trips.
  let pts = 15;
  if (d.durationMinutes != null) {
    if (d.durationMinutes >= 480) pts = 35;
    else if (d.durationMinutes >= 420) pts = 28;
    else if (d.durationMinutes >= 360) pts = 18;
    else if (d.durationMinutes >= 300) pts = 10;
    else pts = 0;
  }
  if (d.quality != null) pts += (d.quality - 5) * 2.5;
  return Math.max(0, Math.min(35, pts));
}

async function fetchTrend7d(userId: string): Promise<{
  current: number | null;
  previous: number | null;
}> {
  const today = new Date();
  const current7Start = new Date(today.getTime() - 7 * DAY_MS);
  const previous7Start = new Date(today.getTime() - 14 * DAY_MS);

  const currentStr = isoDate(current7Start);
  const previousStr = isoDate(previous7Start);
  const todayStr = isoDate(today);

  const sleepRows = await db
    .select({
      logDate: sleepLogs.logDate,
      durationMinutes: sleepLogs.durationMinutes,
      quality: sleepLogs.quality,
    })
    .from(sleepLogs)
    .where(
      and(
        eq(sleepLogs.userId, userId),
        gte(sleepLogs.logDate, previousStr),
        lte(sleepLogs.logDate, todayStr),
      ),
    );

  const currentVals: number[] = [];
  const previousVals: number[] = [];
  for (const r of sleepRows) {
    const v = sleepProxyPoints(r);
    const ds = r.logDate as string;
    if (ds >= currentStr) currentVals.push(v);
    else if (ds >= previousStr) previousVals.push(v);
  }
  const avg = (arr: number[]) =>
    arr.length === 0 ? null : arr.reduce((s, x) => s + x, 0) / arr.length;
  return { current: avg(currentVals), previous: avg(previousVals) };
}

export async function computeTodayReadiness(): Promise<ReadinessResult> {
  const user = await getAuthUser();
  const todayStr = getTurkeyTodayStr();
  const yesterdayStr = addDaysStr(todayStr, -1);

  const [sleep24h, waterYesterday, complianceYesterday, subjective, trend7d] =
    await Promise.all([
      fetchSleep24h(user.id),
      fetchWaterYesterday(user.id, yesterdayStr),
      fetchComplianceYesterday(user.id, yesterdayStr),
      db
        .select({
          energyRating: readinessLogs.energyRating,
          painScore: readinessLogs.painScore,
        })
        .from(readinessLogs)
        .where(
          and(
            eq(readinessLogs.userId, user.id),
            eq(readinessLogs.logDate, todayStr),
          ),
        )
        .then((rows) => rows[0] ?? null),
      fetchTrend7d(user.id),
    ]);

  const input: ReadinessInput = {
    sleep24h,
    waterYesterday,
    complianceYesterday,
    subjective,
    trend7d,
  };

  return computeReadinessScore(input);
}

export interface Readiness7dAverage {
  average: number | null;
  samples: number;
}

/**
 * Average of the last 7 days' passive readiness, used by the deload-policy
 * to decide whether to emit the `low_readiness` reason.
 * Returns `{ average: null, samples: 0 }` when insufficient data.
 */
export async function getReadiness7dAverage(): Promise<Readiness7dAverage> {
  const user = await getAuthUser();
  const today = new Date();
  const sevenAgo = new Date(today.getTime() - 7 * DAY_MS);
  const sevenAgoStr = isoDate(sevenAgo);
  const todayStr = isoDate(today);

  // Approximation: average of (sleep + subjective if entered) per-day,
  // normalized to 0..100. We use the daily sleep row + same-day readiness
  // row if present. For days without sleep we skip (would be neutral).
  const [sleepRows, readinessRows] = await Promise.all([
    db
      .select({
        logDate: sleepLogs.logDate,
        durationMinutes: sleepLogs.durationMinutes,
        quality: sleepLogs.quality,
      })
      .from(sleepLogs)
      .where(
        and(
          eq(sleepLogs.userId, user.id),
          gte(sleepLogs.logDate, sevenAgoStr),
          lte(sleepLogs.logDate, todayStr),
        ),
      ),
    db
      .select({
        logDate: readinessLogs.logDate,
        energyRating: readinessLogs.energyRating,
        painScore: readinessLogs.painScore,
      })
      .from(readinessLogs)
      .where(
        and(
          eq(readinessLogs.userId, user.id),
          gte(readinessLogs.logDate, sevenAgoStr),
          lte(readinessLogs.logDate, todayStr),
        ),
      ),
  ]);

  const readinessByDate = new Map(
    readinessRows.map((r) => [r.logDate as string, r]),
  );
  const scores: number[] = [];
  for (const s of sleepRows) {
    const date = s.logDate as string;
    const subj = readinessByDate.get(date);
    const result = computeReadinessScore({
      sleep24h: { durationMinutes: s.durationMinutes, quality: s.quality },
      waterYesterday: null,
      complianceYesterday: { ratio: null, wasRest: false, hadPlan: false },
      subjective: subj
        ? {
            energyRating: subj.energyRating,
            painScore: subj.painScore,
          }
        : null,
      trend7d: { current: null, previous: null },
    });
    scores.push(result.score);
  }

  // Add readiness-only days (no sleep but subjective entered) — rare.
  for (const r of readinessRows) {
    const date = r.logDate as string;
    if (sleepRows.some((s) => s.logDate === date)) continue;
    const result = computeReadinessScore({
      sleep24h: null,
      waterYesterday: null,
      complianceYesterday: { ratio: null, wasRest: false, hadPlan: false },
      subjective: { energyRating: r.energyRating, painScore: r.painScore },
      trend7d: { current: null, previous: null },
    });
    scores.push(result.score);
  }

  if (scores.length === 0) return { average: null, samples: 0 };
  const average =
    scores.reduce((sum, x) => sum + x, 0) / scores.length;
  return { average, samples: scores.length };
}
