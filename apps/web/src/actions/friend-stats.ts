"use server";

import { db } from "@/db";
import { weeklyPlans, dailyPlans, shares, users } from "@/db/schema";
import { eq, and, sql, asc, isNotNull, or, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { getTurkeyTodayStr, formatDateStr } from "@/lib/utils";

export interface FriendStreakRow {
  userId: string;
  name: string;
  currentStreak: number;
  longestStreak: number;
  isMe: boolean;
}

const FULL_THRESHOLD = 0.8;

interface DayRow {
  userId: string;
  date: string;
  totalMeals: number;
  completedMeals: number;
  totalExercises: number;
  completedExercises: number;
}

function computeStreaks(rows: DayRow[]): { currentStreak: number; longestStreak: number } {
  const todayStr = getTurkeyTodayStr();
  const fullDaysSet = new Set<string>();
  const emptyDays = new Set<string>();
  let programStartDate: string | null = null;

  for (const r of rows) {
    if (!programStartDate) programStartDate = r.date;
    const totalItems = r.totalMeals + r.totalExercises;
    const completedItems = r.completedMeals + r.completedExercises;
    if (totalItems === 0) {
      emptyDays.add(r.date);
      continue;
    }
    if (completedItems / totalItems >= FULL_THRESHOLD) {
      fullDaysSet.add(r.date);
    }
  }

  // Current streak — count back from today
  let currentStreak = 0;
  const startDate = new Date(todayStr + "T00:00:00");
  if (!fullDaysSet.has(todayStr)) {
    startDate.setDate(startDate.getDate() - 1);
  }
  const cursor = new Date(startDate);
  const lowerBound = programStartDate
    ? new Date(programStartDate + "T00:00:00")
    : null;

  while (true) {
    if (lowerBound && cursor.getTime() < lowerBound.getTime()) break;
    const dateStr = formatDateStr(cursor);
    if (fullDaysSet.has(dateStr)) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (emptyDays.has(dateStr)) {
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak
  const sortedFullDays = [...fullDaysSet].sort();
  let longestStreak = 0;
  let currentRun = 0;
  for (let i = 0; i < sortedFullDays.length; i++) {
    if (i === 0) {
      currentRun = 1;
    } else {
      const prev = new Date(sortedFullDays[i - 1] + "T00:00:00");
      const curr = new Date(sortedFullDays[i] + "T00:00:00");
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        let allEmpty = true;
        for (let d = 1; d < diffDays; d++) {
          const between = new Date(prev);
          between.setDate(between.getDate() + d);
          if (!emptyDays.has(formatDateStr(between))) {
            allEmpty = false;
            break;
          }
        }
        currentRun = allEmpty ? currentRun + 1 : 1;
      } else {
        currentRun = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentRun);
  }

  return { currentStreak, longestStreak };
}

export async function getFriendStreaks(): Promise<FriendStreakRow[]> {
  const me = await getAuthUser();

  // Find "friends" = anyone who has a share relationship with me (either direction)
  const shareRows = await db
    .select({
      ownerUserId: shares.ownerUserId,
      sharedWithUserId: shares.sharedWithUserId,
    })
    .from(shares)
    .where(
      or(eq(shares.ownerUserId, me.id), eq(shares.sharedWithUserId, me.id)),
    );

  const friendIds = new Set<string>();
  for (const s of shareRows) {
    if (s.ownerUserId !== me.id) friendIds.add(s.ownerUserId);
    if (s.sharedWithUserId !== me.id) friendIds.add(s.sharedWithUserId);
  }

  if (friendIds.size === 0) return [];

  const allUserIds = [me.id, ...friendIds];

  // Fetch user names
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, allUserIds));
  const nameById = new Map(userRows.map((u) => [u.id, u.name]));

  // Fetch all daily plan completion data for all friends in one query
  const dayRows = await db
    .select({
      userId: weeklyPlans.userId,
      date: dailyPlans.date,
      totalMeals: sql<number>`(SELECT COUNT(*) FROM meals WHERE meals.daily_plan_id = ${dailyPlans.id})`.as("total_meals"),
      completedMeals: sql<number>`(SELECT COUNT(*) FROM meals WHERE meals.daily_plan_id = ${dailyPlans.id} AND meals.is_completed = true)`.as("completed_meals"),
      totalExercises: sql<number>`(SELECT COUNT(*) FROM exercises WHERE exercises.daily_plan_id = ${dailyPlans.id})`.as("total_exercises"),
      completedExercises: sql<number>`(SELECT COUNT(*) FROM exercises WHERE exercises.daily_plan_id = ${dailyPlans.id} AND exercises.is_completed = true)`.as("completed_exercises"),
    })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        inArray(weeklyPlans.userId, allUserIds),
        isNotNull(dailyPlans.date),
      ),
    )
    .orderBy(asc(dailyPlans.date));

  const rowsByUser = new Map<string, DayRow[]>();
  for (const row of dayRows) {
    if (!row.date) continue;
    const userId = row.userId;
    if (!rowsByUser.has(userId)) rowsByUser.set(userId, []);
    rowsByUser.get(userId)!.push({
      userId,
      date: row.date,
      totalMeals: Number(row.totalMeals),
      completedMeals: Number(row.completedMeals),
      totalExercises: Number(row.totalExercises),
      completedExercises: Number(row.completedExercises),
    });
  }

  const result: FriendStreakRow[] = [];
  for (const userId of allUserIds) {
    const rows = rowsByUser.get(userId) ?? [];
    const { currentStreak, longestStreak } = computeStreaks(rows);
    result.push({
      userId,
      name: nameById.get(userId) ?? "?",
      currentStreak,
      longestStreak,
      isMe: userId === me.id,
    });
  }

  result.sort((a, b) => {
    if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
    return b.longestStreak - a.longestStreak;
  });

  return result;
}
