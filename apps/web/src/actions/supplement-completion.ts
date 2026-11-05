"use server";

import { db } from "@/db";
import { supplementCompletions, supplements, weeklyPlans, dailyPlans } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { verifyDailyPlanOwnership } from "@/lib/ownership";

export async function toggleSupplementCompletion(
  supplementId: number,
  date: string,
  completed: boolean,
) {
  const user = await getAuthUser();

  // Verify supplement ownership
  const rows = await db
    .select({ id: supplements.id })
    .from(supplements)
    .innerJoin(weeklyPlans, eq(supplements.weeklyPlanId, weeklyPlans.id))
    .where(and(eq(supplements.id, supplementId), eq(weeklyPlans.userId, user.id)));
  if (rows.length === 0) throw new Error("Unauthorized");

  if (completed) {
    // Insert — ignore conflict (already completed)
    await db
      .insert(supplementCompletions)
      .values({
        supplementId,
        userId: user.id,
        completionDate: date,
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(supplementCompletions)
      .where(
        and(
          eq(supplementCompletions.supplementId, supplementId),
          eq(supplementCompletions.userId, user.id),
          eq(supplementCompletions.completionDate, date),
        ),
      );
  }

  revalidatePath("/gun");
}

export async function getSupplementCompletions(
  weeklyPlanId: number,
  date: string,
) {
  const user = await getAuthUser();

  // Get supplement IDs for this week
  const sups = await db
    .select({ id: supplements.id })
    .from(supplements)
    .where(eq(supplements.weeklyPlanId, weeklyPlanId));

  if (sups.length === 0) return [];

  const supIds = sups.map((s) => s.id);

  const completions = await db
    .select({ supplementId: supplementCompletions.supplementId })
    .from(supplementCompletions)
    .where(
      and(
        inArray(supplementCompletions.supplementId, supIds),
        eq(supplementCompletions.userId, user.id),
        eq(supplementCompletions.completionDate, date),
      ),
    );

  return completions.map((c) => c.supplementId);
}

export interface DailySupplementRow {
  id: number;
  name: string;
  dosage: string;
  timing: string;
  notes: string | null;
  presetKey: string | null;
  servingsPerDose: string | null;
  caloriesPerServing: number | null;
  proteinPerServing: string | null;
  carbsPerServing: string | null;
  fatPerServing: string | null;
  isCompleted: boolean;
}

export async function getSupplementsForDailyPlan(
  dailyPlanId: number,
): Promise<DailySupplementRow[]> {
  const user = await getAuthUser();
  await verifyDailyPlanOwnership(dailyPlanId, user.id);

  const planRows = await db
    .select({
      weeklyPlanId: dailyPlans.weeklyPlanId,
      date: dailyPlans.date,
    })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));

  const plan = planRows[0];
  if (!plan || plan.weeklyPlanId === null || plan.date === null) return [];

  const sups = await db
    .select({
      id: supplements.id,
      name: supplements.name,
      dosage: supplements.dosage,
      timing: supplements.timing,
      notes: supplements.notes,
      presetKey: supplements.presetKey,
      servingsPerDose: supplements.servingsPerDose,
      caloriesPerServing: supplements.caloriesPerServing,
      proteinPerServing: supplements.proteinPerServing,
      carbsPerServing: supplements.carbsPerServing,
      fatPerServing: supplements.fatPerServing,
    })
    .from(supplements)
    .where(eq(supplements.weeklyPlanId, plan.weeklyPlanId));

  if (sups.length === 0) return [];

  const completionRows = await db
    .select({ supplementId: supplementCompletions.supplementId })
    .from(supplementCompletions)
    .where(
      and(
        inArray(
          supplementCompletions.supplementId,
          sups.map((s) => s.id),
        ),
        eq(supplementCompletions.userId, user.id),
        eq(supplementCompletions.completionDate, plan.date),
      ),
    );

  const completedSet = new Set(completionRows.map((c) => c.supplementId));

  return sups.map((s) => ({
    ...s,
    isCompleted: completedSet.has(s.id),
  }));
}
