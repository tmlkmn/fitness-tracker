"use server";

import { db } from "@/db";
import { meals, dailyPlans, weeklyPlans } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import {
  verifyMealOwnership,
  verifyDailyPlanOwnership,
} from "@/lib/ownership";

export async function toggleMealCompleted(id: number, isCompleted: boolean) {
  const user = await getAuthUser();
  await verifyMealOwnership(id, user.id);
  await db.update(meals).set({ isCompleted }).where(eq(meals.id, id));
  revalidatePath("/");
}

export async function getMealsByDay(dailyPlanId: number) {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);
  return db
    .select()
    .from(meals)
    .where(eq(meals.dailyPlanId, dailyPlanId))
    .orderBy(meals.mealTime);
}

export interface DailyMacroPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function getWeeklyMacroTotals(
  endDate: string,
): Promise<DailyMacroPoint[]> {
  const user = await getAuthUser();
  const end = new Date(endDate + "T00:00:00");
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const startStr = start.toISOString().split("T")[0];

  const rows = await db
    .select({
      date: dailyPlans.date,
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
        gte(dailyPlans.date, startStr),
        lte(dailyPlans.date, endDate),
      ),
    );

  const map = new Map<string, DailyMacroPoint>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const ds = d.toISOString().split("T")[0];
    map.set(ds, { date: ds, calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  for (const row of rows) {
    if (!row.date) continue;
    const point = map.get(row.date);
    if (!point) continue;
    point.calories += row.calories ?? 0;
    point.protein += parseFloat(row.proteinG ?? "0") || 0;
    point.carbs += parseFloat(row.carbsG ?? "0") || 0;
    point.fat += parseFloat(row.fatG ?? "0") || 0;
  }

  return Array.from(map.values()).map((p) => ({
    ...p,
    protein: Math.round(p.protein),
    carbs: Math.round(p.carbs),
    fat: Math.round(p.fat),
  }));
}
