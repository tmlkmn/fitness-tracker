"use server";

import { db } from "@/db";
import {
  users,
  sessions,
  aiUsageLogs,
  meals,
  exercises,
  dailyPlans,
  weeklyPlans,
  feedbacks,
} from "@/db/schema";
import { and, eq, gte, lte, isNull, ne, sql } from "drizzle-orm";
import { getAuthAdmin } from "@/lib/auth-utils";
import { getUserStatus } from "@/lib/user-status";
import {
  readAtRiskCache,
  writeAtRiskCache,
  readKpiCache,
  writeKpiCache,
} from "@/lib/admin-ops-cache";
import type {
  AtRiskUser,
  RiskTag,
  AdminKpiSummary,
} from "./admin-operations-types";
import { RISK_PRIORITY } from "./admin-operations-types";

export type {
  AtRiskUser,
  RiskTag,
  AdminKpiSummary,
} from "./admin-operations-types";

function toDateOnlyString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_MS = 86_400_000;
const INACTIVE_DAYS = 7;
const FEEDBACK_AGE_DAYS = 3;
const COMPLIANCE_WINDOW_DAYS = 7;
const COMPLIANCE_MIN_ITEMS = 7;
const COMPLIANCE_THRESHOLD = 0.5;
const EXPIRING_WINDOW_DAYS = 7;
const RESULT_LIMIT = 20;

export async function getAtRiskUsers(): Promise<AtRiskUser[]> {
  await getAuthAdmin();

  const cached = readAtRiskCache();
  if (cached) return cached;

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - FEEDBACK_AGE_DAYS * DAY_MS);
  const sevenDaysFromNow = new Date(
    now.getTime() + EXPIRING_WINDOW_DAYS * DAY_MS,
  );
  const complianceFrom = new Date(
    now.getTime() - COMPLIANCE_WINDOW_DAYS * DAY_MS,
  );
  const complianceFromStr = toDateOnlyString(complianceFrom);
  const todayStr = toDateOnlyString(now);

  const [
    allUsers,
    sessionAct,
    aiAct,
    mealCompliance,
    exerciseCompliance,
    openFeedback,
  ] = await Promise.all([
    db
      .select()
      .from(users)
      .where(and(isNull(users.frozenAt), ne(users.role, "admin"))),
    db
      .select({
        userId: sessions.userId,
        lastActive: sql<Date>`max(${sessions.updatedAt})`,
      })
      .from(sessions)
      .groupBy(sessions.userId),
    db
      .select({
        userId: aiUsageLogs.userId,
        lastActive: sql<Date>`max(${aiUsageLogs.createdAt})`,
      })
      .from(aiUsageLogs)
      .groupBy(aiUsageLogs.userId),
    db
      .select({
        userId: weeklyPlans.userId,
        done: sql<number>`count(*) filter (where ${meals.isCompleted})::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(meals)
      .innerJoin(dailyPlans, eq(dailyPlans.id, meals.dailyPlanId))
      .innerJoin(weeklyPlans, eq(weeklyPlans.id, dailyPlans.weeklyPlanId))
      .where(
        and(
          gte(dailyPlans.date, complianceFromStr),
          lte(dailyPlans.date, todayStr),
        ),
      )
      .groupBy(weeklyPlans.userId),
    db
      .select({
        userId: weeklyPlans.userId,
        done: sql<number>`count(*) filter (where ${exercises.isCompleted})::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(exercises)
      .innerJoin(dailyPlans, eq(dailyPlans.id, exercises.dailyPlanId))
      .innerJoin(weeklyPlans, eq(weeklyPlans.id, dailyPlans.weeklyPlanId))
      .where(
        and(
          gte(dailyPlans.date, complianceFromStr),
          lte(dailyPlans.date, todayStr),
        ),
      )
      .groupBy(weeklyPlans.userId),
    db
      .select({
        userId: feedbacks.userId,
        oldestOpenAt: sql<Date>`min(${feedbacks.createdAt})`,
      })
      .from(feedbacks)
      .where(
        and(
          eq(feedbacks.status, "open"),
          lte(feedbacks.createdAt, threeDaysAgo),
        ),
      )
      .groupBy(feedbacks.userId),
  ]);

  const sessionMap = new Map<string, Date>(
    sessionAct.map((r) => [r.userId, new Date(r.lastActive)]),
  );
  const aiMap = new Map<string, Date>(
    aiAct.map((r) => [r.userId, new Date(r.lastActive)]),
  );
  const mealMap = new Map<string, { done: number; total: number }>(
    mealCompliance.map((r) => [r.userId, { done: r.done, total: r.total }]),
  );
  const exerciseMap = new Map<string, { done: number; total: number }>(
    exerciseCompliance.map((r) => [
      r.userId,
      { done: r.done, total: r.total },
    ]),
  );
  const feedbackMap = new Map<string, Date>(
    openFeedback.map((r) => [r.userId, new Date(r.oldestOpenAt)]),
  );

  const result: AtRiskUser[] = [];

  for (const u of allUsers) {
    const risks: RiskTag[] = [];

    let daysUntilExpiry: number | null = null;
    if (u.membershipEndDate) {
      const end = new Date(u.membershipEndDate);
      if (end >= now && end <= sevenDaysFromNow) {
        risks.push("expiring");
        daysUntilExpiry = Math.ceil(
          (end.getTime() - now.getTime()) / DAY_MS,
        );
      }
    }

    const sessionLast = sessionMap.get(u.id) ?? null;
    const aiLast = aiMap.get(u.id) ?? null;
    const candidates = [sessionLast, aiLast].filter(
      (d): d is Date => d != null,
    );
    const lastActiveAt: Date | null =
      candidates.length === 0
        ? null
        : new Date(Math.max(...candidates.map((d) => d.getTime())));

    let daysSinceActive: number | null = null;
    const userAgeDays =
      (now.getTime() - new Date(u.createdAt).getTime()) / DAY_MS;
    if (lastActiveAt) {
      daysSinceActive = Math.floor(
        (now.getTime() - lastActiveAt.getTime()) / DAY_MS,
      );
      if (daysSinceActive >= INACTIVE_DAYS && userAgeDays >= INACTIVE_DAYS) {
        risks.push("inactive");
      }
    } else if (userAgeDays >= INACTIVE_DAYS) {
      risks.push("inactive");
      daysSinceActive = Math.floor(userAgeDays);
    }

    const m = mealMap.get(u.id) ?? { done: 0, total: 0 };
    const e = exerciseMap.get(u.id) ?? { done: 0, total: 0 };
    const totalItems = m.total + e.total;
    let complianceRatio: number | null = null;
    if (totalItems >= COMPLIANCE_MIN_ITEMS) {
      complianceRatio = (m.done + e.done) / totalItems;
      if (complianceRatio < COMPLIANCE_THRESHOLD) {
        risks.push("low_compliance");
      }
    }

    let oldestOpenFeedbackDays: number | null = null;
    const oldest = feedbackMap.get(u.id);
    if (oldest) {
      const ageDays = Math.floor(
        (now.getTime() - oldest.getTime()) / DAY_MS,
      );
      if (ageDays >= FEEDBACK_AGE_DAYS) {
        risks.push("pending_feedback");
        oldestOpenFeedbackDays = ageDays;
      }
    }

    if (risks.length === 0) continue;

    const status = getUserStatus({
      role: u.role,
      frozenAt: u.frozenAt,
      isApproved: u.isApproved,
      mustChangePassword: u.mustChangePassword,
      membershipEndDate: u.membershipEndDate,
      inviteExpiresAt: u.inviteExpiresAt,
    });

    result.push({
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        status,
        createdAt: u.createdAt,
        membershipType: u.membershipType,
        membershipStartDate: u.membershipStartDate,
        membershipEndDate: u.membershipEndDate,
        frozenAt: u.frozenAt,
        isFrozen: u.frozenAt !== null,
      },
      risks,
      lastActiveAt,
      daysSinceActive,
      complianceRatio,
      complianceItems: totalItems,
      daysUntilExpiry,
      oldestOpenFeedbackDays,
    });
  }

  result.sort((a, b) => {
    const aTop = Math.max(...a.risks.map((r) => RISK_PRIORITY[r]));
    const bTop = Math.max(...b.risks.map((r) => RISK_PRIORITY[r]));
    if (aTop !== bTop) return bTop - aTop;
    if (a.risks.length !== b.risks.length) {
      return b.risks.length - a.risks.length;
    }
    // tiebreak: most acute signal (lowest days-until-expiry first, then longest-inactive)
    if (
      a.daysUntilExpiry != null &&
      b.daysUntilExpiry != null &&
      a.daysUntilExpiry !== b.daysUntilExpiry
    ) {
      return a.daysUntilExpiry - b.daysUntilExpiry;
    }
    return (b.daysSinceActive ?? 0) - (a.daysSinceActive ?? 0);
  });

  const sliced = result.slice(0, RESULT_LIMIT);
  writeAtRiskCache(sliced);
  return sliced;
}

export interface AiCostSummary {
  todayUsd: number;
  weekUsd: number;
  monthUsd: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
}

export async function getAdminAiCostSummary(): Promise<AiCostSummary> {
  await getAuthAdmin();
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const buckets = await Promise.all(
    [startOfToday, startOfWeek, startOfMonth].map((since) =>
      db
        .select({
          sum: sql<string>`coalesce(sum(${aiUsageLogs.estCostUsd}), 0)::text`,
          count: sql<number>`count(*)::int`,
        })
        .from(aiUsageLogs)
        .where(gte(aiUsageLogs.createdAt, since)),
    ),
  );

  return {
    todayUsd: Number(buckets[0][0]?.sum ?? 0),
    weekUsd: Number(buckets[1][0]?.sum ?? 0),
    monthUsd: Number(buckets[2][0]?.sum ?? 0),
    todayCount: buckets[0][0]?.count ?? 0,
    weekCount: buckets[1][0]?.count ?? 0,
    monthCount: buckets[2][0]?.count ?? 0,
  };
}

export async function getAdminKpiSummary(): Promise<AdminKpiSummary> {
  await getAuthAdmin();

  const cached = readKpiCache();
  if (cached) return cached;

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * DAY_MS);

  const [activeRow, costToday, costWeek, newUsers, openFb, expiring] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            eq(users.isApproved, true),
            isNull(users.frozenAt),
            ne(users.role, "admin"),
          ),
        ),
      db
        .select({
          sum: sql<string>`coalesce(sum(${aiUsageLogs.estCostUsd}), 0)::text`,
        })
        .from(aiUsageLogs)
        .where(gte(aiUsageLogs.createdAt, startOfToday)),
      db
        .select({
          sum: sql<string>`coalesce(sum(${aiUsageLogs.estCostUsd}), 0)::text`,
        })
        .from(aiUsageLogs)
        .where(gte(aiUsageLogs.createdAt, startOfWeek)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(gte(users.createdAt, startOfWeek)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(feedbacks)
        .where(eq(feedbacks.status, "open")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(
          and(
            eq(users.isApproved, true),
            isNull(users.frozenAt),
            ne(users.role, "admin"),
            gte(users.membershipEndDate, now),
            lte(users.membershipEndDate, sevenDaysFromNow),
          ),
        ),
    ]);

  const result: AdminKpiSummary = {
    activeUsers: activeRow[0]?.count ?? 0,
    aiCostTodayUsd: Number(costToday[0]?.sum ?? 0),
    aiCostWeekUsd: Number(costWeek[0]?.sum ?? 0),
    newUsersThisWeek: newUsers[0]?.count ?? 0,
    openFeedback: openFb[0]?.count ?? 0,
    expiringWithin7d: expiring[0]?.count ?? 0,
  };

  writeKpiCache(result);
  return result;
}
