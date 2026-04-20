"use server";

import { db } from "@/db";
import { aiPlanSuggestions } from "@/db/schema";
import { eq, and, asc, sql, gte, or } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { validateWeeklyPlan, type AIWeeklyPlan } from "@/lib/ai-weekly-types";

const MAX_SAVED = 20;

export async function saveAiSuggestion({
  plan,
  userNote,
  originalDate,
}: {
  plan: AIWeeklyPlan;
  userNote: string | null;
  originalDate: string;
}): Promise<{ id: number }> {
  const user = await getAuthUser();

  // Enforce max limit — delete oldest if at capacity
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiPlanSuggestions)
    .where(eq(aiPlanSuggestions.userId, user.id));

  const currentCount = countRow?.count ?? 0;
  if (currentCount >= MAX_SAVED) {
    const toDelete = currentCount - MAX_SAVED + 1;
    const oldest = await db
      .select({ id: aiPlanSuggestions.id })
      .from(aiPlanSuggestions)
      .where(eq(aiPlanSuggestions.userId, user.id))
      .orderBy(asc(aiPlanSuggestions.createdAt))
      .limit(toDelete);

    for (const row of oldest) {
      await db
        .delete(aiPlanSuggestions)
        .where(and(eq(aiPlanSuggestions.id, row.id), eq(aiPlanSuggestions.userId, user.id)));
    }
  }

  const [inserted] = await db
    .insert(aiPlanSuggestions)
    .values({
      userId: user.id,
      title: plan.weekTitle,
      phase: plan.phase,
      userNote: userNote ?? null,
      plan: plan as unknown as Record<string, unknown>,
      originalDate,
    })
    .returning({ id: aiPlanSuggestions.id });

  return { id: inserted.id };
}

export interface SavedSuggestionMeta {
  id: number;
  title: string;
  phase: string;
  userNote: string | null;
  originalDate: string | null;
  createdAt: Date;
}

export async function getSavedSuggestions(): Promise<SavedSuggestionMeta[]> {
  const user = await getAuthUser();

  // Calculate current week's Monday (Turkey timezone)
  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const today = getTurkeyTodayStr();
  const todayDate = new Date(today + "T00:00:00");
  const dayOfWeek = todayDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  todayDate.setDate(todayDate.getDate() + diff);
  const currentMonday = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;

  const rows = await db
    .select({
      id: aiPlanSuggestions.id,
      title: aiPlanSuggestions.title,
      phase: aiPlanSuggestions.phase,
      userNote: aiPlanSuggestions.userNote,
      originalDate: aiPlanSuggestions.originalDate,
      createdAt: aiPlanSuggestions.createdAt,
    })
    .from(aiPlanSuggestions)
    .where(
      and(
        eq(aiPlanSuggestions.userId, user.id),
        or(
          gte(aiPlanSuggestions.originalDate, currentMonday),
          sql`${aiPlanSuggestions.originalDate} IS NULL`,
        ),
      ),
    )
    .orderBy(asc(aiPlanSuggestions.createdAt));

  return rows.map((r) => ({
    ...r,
    originalDate: r.originalDate ?? null,
  }));
}

export async function getSavedSuggestionById(id: number): Promise<{
  id: number;
  title: string;
  phase: string;
  userNote: string | null;
  plan: AIWeeklyPlan;
}> {
  const user = await getAuthUser();

  const [row] = await db
    .select()
    .from(aiPlanSuggestions)
    .where(
      and(eq(aiPlanSuggestions.id, id), eq(aiPlanSuggestions.userId, user.id)),
    );

  if (!row) throw new Error("NOT_FOUND");

  const plan = validateWeeklyPlan(row.plan);

  return {
    id: row.id,
    title: row.title,
    phase: row.phase,
    userNote: row.userNote,
    plan,
  };
}

export async function deleteSavedSuggestion(id: number): Promise<void> {
  const user = await getAuthUser();

  const [row] = await db
    .select({ id: aiPlanSuggestions.id })
    .from(aiPlanSuggestions)
    .where(
      and(eq(aiPlanSuggestions.id, id), eq(aiPlanSuggestions.userId, user.id)),
    );

  if (!row) throw new Error("NOT_FOUND");

  await db
    .delete(aiPlanSuggestions)
    .where(and(eq(aiPlanSuggestions.id, id), eq(aiPlanSuggestions.userId, user.id)));
}
