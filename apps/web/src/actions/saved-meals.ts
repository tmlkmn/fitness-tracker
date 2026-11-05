"use server";

import { db } from "@/db";
import { savedMealSuggestions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";

export async function saveMealSuggestion(data: {
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}) {
  const user = await getAuthUser();
  await db.insert(savedMealSuggestions).values({
    userId: user.id,
    mealLabel: data.mealLabel,
    content: data.content,
    calories: data.calories,
    proteinG: data.proteinG,
    carbsG: data.carbsG,
    fatG: data.fatG,
  });
}

export async function getSavedMealSuggestions(mealLabel?: string) {
  const user = await getAuthUser();
  const conditions = [eq(savedMealSuggestions.userId, user.id)];
  if (mealLabel) {
    conditions.push(eq(savedMealSuggestions.mealLabel, mealLabel));
  }
  return db
    .select()
    .from(savedMealSuggestions)
    .where(and(...conditions))
    .orderBy(desc(savedMealSuggestions.createdAt))
    .limit(50);
}

export async function deleteSavedMealSuggestion(id: number) {
  const user = await getAuthUser();
  await db
    .delete(savedMealSuggestions)
    .where(
      and(
        eq(savedMealSuggestions.id, id),
        eq(savedMealSuggestions.userId, user.id)
      )
    );
}
