"use server";

import { db } from "@/db";
import {
  meals,
  dailyPlans,
  weeklyPlans,
  savedMealSuggestions,
  aiDailyMealSuggestions,
} from "@/db/schema";
import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import type { AIMeal } from "./ai-meals";

export interface MealCandidate {
  source: "frequent" | "history" | "saved" | "daily-plan";
  id: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
  meta?: string;
}

export interface DailyPlanCandidate {
  source: "daily-plan";
  id: number;
  planType: string;
  userNote: string | null;
  meals: AIMeal[];
  createdAt: Date | null;
}

export interface MealPickerData {
  frequent: MealCandidate[];
  history: MealCandidate[];
  saved: MealCandidate[];
  dailyPlans: DailyPlanCandidate[];
}

export async function getMealPickerData(
  query?: string,
  excludeDailyPlanId?: number,
): Promise<MealPickerData> {
  const user = await getAuthUser();
  const q = query?.trim().toLowerCase() ?? "";
  const like_ = q ? `%${q}%` : null;

  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const today = getTurkeyTodayStr();
  const thirtyDaysAgo = new Date(today + "T00:00:00");
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  // ── Frequent (aggregated by content) ──
  const frequentRows = await db
    .select({
      content: meals.content,
      mealLabel: meals.mealLabel,
      avgCalories: sql<number>`ROUND(AVG(${meals.calories}))`.as("avg_calories"),
      avgProtein: sql<string>`ROUND(AVG(${meals.proteinG}::numeric), 1)::text`.as("avg_protein"),
      avgCarbs: sql<string>`ROUND(AVG(${meals.carbsG}::numeric), 1)::text`.as("avg_carbs"),
      avgFat: sql<string>`ROUND(AVG(${meals.fatG}::numeric), 1)::text`.as("avg_fat"),
      count: sql<number>`COUNT(*)::int`.as("count"),
    })
    .from(meals)
    .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        gte(dailyPlans.date, cutoff),
        like_
          ? or(like(meals.content, like_), like(meals.mealLabel, like_))
          : undefined,
      ),
    )
    .groupBy(meals.content, meals.mealLabel)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(15);

  const frequent: MealCandidate[] = frequentRows.map((r, i) => ({
    source: "frequent",
    id: `freq-${i}`,
    mealLabel: r.mealLabel,
    content: r.content,
    calories: r.avgCalories ? Number(r.avgCalories) : null,
    proteinG: r.avgProtein,
    carbsG: r.avgCarbs,
    fatG: r.avgFat,
    meta: `${r.count}x kullanıldı`,
  }));

  // ── History (individual meals from past days) ──
  const historyRows = await db
    .select({
      id: meals.id,
      date: dailyPlans.date,
      mealLabel: meals.mealLabel,
      content: meals.content,
      calories: meals.calories,
      proteinG: meals.proteinG,
      carbsG: meals.carbsG,
      fatG: meals.fatG,
    })
    .from(meals)
    .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, user.id),
        excludeDailyPlanId
          ? sql`${meals.dailyPlanId} <> ${excludeDailyPlanId}`
          : undefined,
        like_
          ? or(like(meals.content, like_), like(meals.mealLabel, like_))
          : undefined,
      ),
    )
    .orderBy(desc(dailyPlans.date))
    .limit(25);

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
  };

  const history: MealCandidate[] = historyRows.map((r) => ({
    source: "history",
    id: `hist-${r.id}`,
    mealLabel: r.mealLabel,
    content: r.content,
    calories: r.calories,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    meta: formatDate(r.date),
  }));

  // ── Saved (manually bookmarked) ──
  const savedRows = await db
    .select()
    .from(savedMealSuggestions)
    .where(
      and(
        eq(savedMealSuggestions.userId, user.id),
        like_
          ? or(
              like(savedMealSuggestions.content, like_),
              like(savedMealSuggestions.mealLabel, like_),
            )
          : undefined,
      ),
    )
    .orderBy(desc(savedMealSuggestions.createdAt))
    .limit(50);

  const saved: MealCandidate[] = savedRows.map((r) => ({
    source: "saved",
    id: `saved-${r.id}`,
    mealLabel: r.mealLabel,
    content: r.content,
    calories: r.calories,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
  }));

  // ── Daily Plans (AI-generated full-day templates) ──
  const dailyPlanRows = await db
    .select()
    .from(aiDailyMealSuggestions)
    .where(eq(aiDailyMealSuggestions.userId, user.id))
    .orderBy(desc(aiDailyMealSuggestions.createdAt))
    .limit(20);

  const dailyPlansOut: DailyPlanCandidate[] = dailyPlanRows
    .map((r) => ({
      source: "daily-plan" as const,
      id: r.id,
      planType: r.planType,
      userNote: r.userNote,
      meals: r.meals as AIMeal[],
      createdAt: r.createdAt,
    }))
    .filter((p) => {
      if (!q) return true;
      if (p.userNote?.toLowerCase().includes(q)) return true;
      return p.meals.some(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.mealLabel.toLowerCase().includes(q),
      );
    });

  return {
    frequent,
    history,
    saved,
    dailyPlans: dailyPlansOut,
  };
}
