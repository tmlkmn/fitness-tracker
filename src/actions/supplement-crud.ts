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
}

async function verifySupplementOwnership(supplementId: number, userId: string) {
  const rows = await db
    .select({ id: supplements.id })
    .from(supplements)
    .innerJoin(weeklyPlans, eq(supplements.weeklyPlanId, weeklyPlans.id))
    .where(and(eq(supplements.id, supplementId), eq(weeklyPlans.userId, userId)));
  if (rows.length === 0) throw new Error("Unauthorized");
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
