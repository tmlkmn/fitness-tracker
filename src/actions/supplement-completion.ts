"use server";

import { db } from "@/db";
import { supplementCompletions, supplements, weeklyPlans } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";

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
