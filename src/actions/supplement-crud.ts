"use server";

import { db } from "@/db";
import { supplements, weeklyPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { verifyWeeklyPlanOwnership } from "@/lib/ownership";

interface SupplementInput {
  name: string;
  dosage: string;
  timing: string;
  notes?: string | null;
  presetKey?: string | null;
  servingsPerDose?: number | null;
  caloriesPerServing?: number | null;
  proteinPerServing?: number | null;
  carbsPerServing?: number | null;
  fatPerServing?: number | null;
}

async function verifySupplementOwnership(supplementId: number, userId: string) {
  const rows = await db
    .select({ id: supplements.id })
    .from(supplements)
    .innerJoin(weeklyPlans, eq(supplements.weeklyPlanId, weeklyPlans.id))
    .where(and(eq(supplements.id, supplementId), eq(weeklyPlans.userId, userId)));
  if (rows.length === 0) throw new Error("Unauthorized");
}

function toNumericString(n: number | null | undefined): string | null {
  if (n === null || n === undefined || !Number.isFinite(n)) return null;
  return String(n);
}

function macroFields(data: SupplementInput) {
  return {
    presetKey: data.presetKey ?? null,
    servingsPerDose: toNumericString(data.servingsPerDose ?? null),
    caloriesPerServing:
      data.caloriesPerServing !== null && data.caloriesPerServing !== undefined && Number.isFinite(data.caloriesPerServing)
        ? Math.round(data.caloriesPerServing)
        : null,
    proteinPerServing: toNumericString(data.proteinPerServing ?? null),
    carbsPerServing: toNumericString(data.carbsPerServing ?? null),
    fatPerServing: toNumericString(data.fatPerServing ?? null),
  };
}

export async function createSupplement(
  weeklyPlanId: number,
  data: SupplementInput,
) {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);

  const [supplement] = await db
    .insert(supplements)
    .values({
      weeklyPlanId,
      name: data.name,
      dosage: data.dosage,
      timing: data.timing,
      notes: data.notes ?? null,
      startWeek: 1,
      ...macroFields(data),
    })
    .returning({ id: supplements.id });

  revalidatePath("/takvim");
  revalidatePath("/gun");
  return supplement;
}

export async function updateSupplement(
  supplementId: number,
  data: SupplementInput,
) {
  const user = await getAuthUser();
  await verifySupplementOwnership(supplementId, user.id);

  await db
    .update(supplements)
    .set({
      name: data.name,
      dosage: data.dosage,
      timing: data.timing,
      notes: data.notes ?? null,
      ...macroFields(data),
    })
    .where(eq(supplements.id, supplementId));

  revalidatePath("/takvim");
  revalidatePath("/gun");
}

export async function deleteSupplement(supplementId: number) {
  const user = await getAuthUser();
  await verifySupplementOwnership(supplementId, user.id);

  await db.delete(supplements).where(eq(supplements.id, supplementId));

  revalidatePath("/takvim");
  revalidatePath("/gun");
}
