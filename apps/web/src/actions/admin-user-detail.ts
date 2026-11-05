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
  progressLogs,
  feedbacks,
} from "@/db/schema";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { getAuthAdmin } from "@/lib/auth-utils";
import { getUserStatus } from "@/lib/user-status";
import { sendNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";
import type { UserWithStatus } from "./admin";

const DAY_MS = 86_400_000;
const WEIGHT_TREND_DAYS = 30;
const WEIGHT_TREND_LIMIT = 30;
const AI_MONTH_FEATURES_LIMIT = 20;
const RECENT_FEEDBACK_LIMIT = 5;

function toDateOnlyString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ComplianceStats {
  mealsDone: number;
  mealsTotal: number;
  exercisesDone: number;
  exercisesTotal: number;
  /** null when totalItems === 0 (no plans in window). */
  ratio: number | null;
}

export interface WeightPoint {
  logDate: string;
  weight: number;
}

export interface WeightTrend {
  points: WeightPoint[];
  /** points[last].weight - points[0].weight, or null if <2 points. */
  deltaKg: number | null;
  /** Linear-regression slope per 7 days, or null if <2 points. */
  slopePerWeek: number | null;
  targetWeight: number | null;
  latestWeight: number | null;
}

export interface AiFeatureUsage {
  feature: string;
  count: number;
  estCostUsd: number;
}

export interface UserFeedbackItem {
  id: number;
  category: string;
  rating: number | null;
  message: string;
  status: string;
  adminResponse: string | null;
  respondedAt: Date | null;
  createdAt: Date;
}

export interface UserAdminDetail {
  user: UserWithStatus;
  profile: {
    locale: string;
    role: string | null;
    weight: number | null;
    targetWeight: number | null;
    height: number | null;
    age: number | null;
    fitnessGoal: string | null;
    fitnessLevel: string | null;
  };
  lastSessionAt: Date | null;
  lastAiAt: Date | null;
  lastProgressLogAt: Date | null;
  lastActiveAt: Date | null;
  complianceLast7d: ComplianceStats;
  complianceLast14d: ComplianceStats;
  complianceLast30d: ComplianceStats;
  weightTrend30d: WeightTrend;
  aiUsageThisMonth: AiFeatureUsage[];
  aiUsageThisMonthTotalCost: number;
  recentFeedback: UserFeedbackItem[];
}

async function fetchCompliance(
  userId: string,
  days: number,
): Promise<ComplianceStats> {
  const now = new Date();
  const from = new Date(now.getTime() - days * DAY_MS);
  const fromStr = toDateOnlyString(from);
  const todayStr = toDateOnlyString(now);

  const [mealAgg, exerciseAgg] = await Promise.all([
    db
      .select({
        done: sql<number>`count(*) filter (where ${meals.isCompleted})::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(meals)
      .innerJoin(dailyPlans, eq(dailyPlans.id, meals.dailyPlanId))
      .innerJoin(weeklyPlans, eq(weeklyPlans.id, dailyPlans.weeklyPlanId))
      .where(
        and(
          eq(weeklyPlans.userId, userId),
          gte(dailyPlans.date, fromStr),
          lte(dailyPlans.date, todayStr),
        ),
      ),
    db
      .select({
        done: sql<number>`count(*) filter (where ${exercises.isCompleted})::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(exercises)
      .innerJoin(dailyPlans, eq(dailyPlans.id, exercises.dailyPlanId))
      .innerJoin(weeklyPlans, eq(weeklyPlans.id, dailyPlans.weeklyPlanId))
      .where(
        and(
          eq(weeklyPlans.userId, userId),
          gte(dailyPlans.date, fromStr),
          lte(dailyPlans.date, todayStr),
        ),
      ),
  ]);

  const mealsDone = mealAgg[0]?.done ?? 0;
  const mealsTotal = mealAgg[0]?.total ?? 0;
  const exercisesDone = exerciseAgg[0]?.done ?? 0;
  const exercisesTotal = exerciseAgg[0]?.total ?? 0;
  const totalItems = mealsTotal + exercisesTotal;
  const ratio =
    totalItems > 0 ? (mealsDone + exercisesDone) / totalItems : null;

  return { mealsDone, mealsTotal, exercisesDone, exercisesTotal, ratio };
}

export async function getUserComplianceStats(
  userId: string,
  days: number,
): Promise<ComplianceStats> {
  await getAuthAdmin();
  return fetchCompliance(userId, days);
}

async function fetchWeightTrend(
  userId: string,
  targetWeight: number | null,
): Promise<WeightTrend> {
  const from = new Date(Date.now() - WEIGHT_TREND_DAYS * DAY_MS);
  const fromStr = toDateOnlyString(from);

  const rows = await db
    .select({
      logDate: progressLogs.logDate,
      weight: progressLogs.weight,
    })
    .from(progressLogs)
    .where(
      and(
        eq(progressLogs.userId, userId),
        gte(progressLogs.logDate, fromStr),
        sql`${progressLogs.weight} is not null`,
      ),
    )
    .orderBy(progressLogs.logDate)
    .limit(WEIGHT_TREND_LIMIT);

  const points: WeightPoint[] = [];
  for (const r of rows) {
    if (r.weight == null) continue;
    const w = Number(r.weight);
    if (!Number.isFinite(w)) continue;
    points.push({ logDate: r.logDate as string, weight: w });
  }

  let deltaKg: number | null = null;
  let slopePerWeek: number | null = null;
  const latestWeight = points.length > 0 ? points[points.length - 1].weight : null;

  if (points.length >= 2) {
    deltaKg = points[points.length - 1].weight - points[0].weight;
    const first = new Date(points[0].logDate).getTime();
    const xs: number[] = [];
    const ys: number[] = [];
    for (const p of points) {
      xs.push((new Date(p.logDate).getTime() - first) / DAY_MS);
      ys.push(p.weight);
    }
    const meanX = xs.reduce((s, x) => s + x, 0) / xs.length;
    const meanY = ys.reduce((s, y) => s + y, 0) / ys.length;
    let num = 0;
    let den = 0;
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    if (den > 0) slopePerWeek = (num / den) * 7;
  }

  return { points, deltaKg, slopePerWeek, targetWeight, latestWeight };
}

export async function getUserWeightTrend(
  userId: string,
): Promise<WeightTrend> {
  await getAuthAdmin();
  const [u] = await db
    .select({ targetWeight: users.targetWeight })
    .from(users)
    .where(eq(users.id, userId));
  const targetWeight = u?.targetWeight ? Number(u.targetWeight) : null;
  return fetchWeightTrend(userId, targetWeight);
}

export async function getUserAdminDetail(
  userId: string,
): Promise<UserAdminDetail> {
  await getAuthAdmin();

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error("User not found");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const targetWeight = user.targetWeight ? Number(user.targetWeight) : null;

  const [
    sessionLast,
    aiLast,
    progressLast,
    compl7,
    compl14,
    compl30,
    weight,
    aiMonth,
    recentFb,
  ] = await Promise.all([
    db
      .select({ at: sql<Date>`max(${sessions.updatedAt})` })
      .from(sessions)
      .where(eq(sessions.userId, userId)),
    db
      .select({ at: sql<Date>`max(${aiUsageLogs.createdAt})` })
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.userId, userId)),
    db
      .select({ at: sql<Date>`max(${progressLogs.createdAt})` })
      .from(progressLogs)
      .where(eq(progressLogs.userId, userId)),
    fetchCompliance(userId, 7),
    fetchCompliance(userId, 14),
    fetchCompliance(userId, 30),
    fetchWeightTrend(userId, targetWeight),
    db
      .select({
        feature: aiUsageLogs.feature,
        count: sql<number>`count(*)::int`,
        cost: sql<string>`coalesce(sum(${aiUsageLogs.estCostUsd}), 0)::text`,
      })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.userId, userId),
          gte(aiUsageLogs.createdAt, startOfMonth),
        ),
      )
      .groupBy(aiUsageLogs.feature)
      .orderBy(sql`count(*) desc`)
      .limit(AI_MONTH_FEATURES_LIMIT),
    db
      .select({
        id: feedbacks.id,
        category: feedbacks.category,
        rating: feedbacks.rating,
        message: feedbacks.message,
        status: feedbacks.status,
        adminResponse: feedbacks.adminResponse,
        respondedAt: feedbacks.respondedAt,
        createdAt: feedbacks.createdAt,
      })
      .from(feedbacks)
      .where(eq(feedbacks.userId, userId))
      .orderBy(desc(feedbacks.createdAt))
      .limit(RECENT_FEEDBACK_LIMIT),
  ]);

  const lastSessionAt = sessionLast[0]?.at
    ? new Date(sessionLast[0].at)
    : null;
  const lastAiAt = aiLast[0]?.at ? new Date(aiLast[0].at) : null;
  const lastProgressLogAt = progressLast[0]?.at
    ? new Date(progressLast[0].at)
    : null;

  let lastActiveAt: Date | null = null;
  for (const c of [lastSessionAt, lastAiAt]) {
    if (c && (!lastActiveAt || c > lastActiveAt)) lastActiveAt = c;
  }

  const aiUsageThisMonth: AiFeatureUsage[] = aiMonth.map((r) => ({
    feature: r.feature,
    count: r.count,
    estCostUsd: Number(r.cost),
  }));
  const aiUsageThisMonthTotalCost = aiUsageThisMonth.reduce(
    (s, r) => s + r.estCostUsd,
    0,
  );

  const status = getUserStatus({
    role: user.role,
    frozenAt: user.frozenAt,
    isApproved: user.isApproved,
    mustChangePassword: user.mustChangePassword,
    membershipEndDate: user.membershipEndDate,
    inviteExpiresAt: user.inviteExpiresAt,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      status,
      createdAt: user.createdAt,
      membershipType: user.membershipType,
      membershipStartDate: user.membershipStartDate,
      membershipEndDate: user.membershipEndDate,
      frozenAt: user.frozenAt,
      isFrozen: user.frozenAt !== null,
    },
    profile: {
      locale: user.locale,
      role: user.role,
      weight: user.weight ? Number(user.weight) : null,
      targetWeight,
      height: user.height,
      age: user.age,
      fitnessGoal: user.fitnessGoal,
      fitnessLevel: user.fitnessLevel,
    },
    lastSessionAt,
    lastAiAt,
    lastProgressLogAt,
    lastActiveAt,
    complianceLast7d: compl7,
    complianceLast14d: compl14,
    complianceLast30d: compl30,
    weightTrend30d: weight,
    aiUsageThisMonth,
    aiUsageThisMonthTotalCost,
    recentFeedback: recentFb,
  };
}

export async function sendUserNudge(
  userId: string,
  subject: string,
  message: string,
): Promise<{ success: true }> {
  const admin = await getAuthAdmin();

  const trimmedSubject = subject.trim().slice(0, 200);
  const trimmedMessage = message.trim().slice(0, 1000);

  if (!trimmedSubject) throw new Error("Subject required");
  if (!trimmedMessage) throw new Error("Message required");

  const [u] = await db
    .select({ role: users.role, locale: users.locale })
    .from(users)
    .where(eq(users.id, userId));
  if (!u) throw new Error("User not found");
  if (u.role === "admin") throw new Error("Cannot nudge admin");

  await sendNotification({
    userId,
    type: "admin_nudge",
    title: trimmedSubject,
    body: trimmedMessage,
    link: u.locale === "en" ? "/en" : "/tr",
    metadata: { sentBy: admin.id },
  });

  logAudit({
    adminId: admin.id,
    action: "user.nudge",
    entityType: "user",
    entityId: userId,
    details: { subject: trimmedSubject },
  }).catch(() => {});

  return { success: true };
}
