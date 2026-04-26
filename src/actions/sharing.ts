"use server";

import { db } from "@/db";
import { shares, weeklyPlans, users } from "@/db/schema";
import { eq, and, ne, gte, or, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { verifyWeeklyPlanOwnership } from "@/lib/ownership";
import { sendNotification } from "@/lib/notifications";
import { addDaysStr, getTurkeyTodayStr, isWeekPast } from "@/lib/utils";

export async function shareWeeklyPlan(
  weeklyPlanId: number,
  sharedWithUserId: string
) {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);

  if (sharedWithUserId === user.id) {
    throw new Error("Kendi planınızı kendinizle paylaşamazsınız");
  }

  // Block sharing past weeks (week end < today)
  const [planRow] = await db
    .select({ startDate: weeklyPlans.startDate })
    .from(weeklyPlans)
    .where(eq(weeklyPlans.id, weeklyPlanId));
  if (planRow?.startDate && isWeekPast(planRow.startDate)) {
    throw new Error("Geçmiş haftalar paylaşılamaz");
  }

  // Check if already shared
  const existing = await db
    .select({ id: shares.id })
    .from(shares)
    .where(
      and(
        eq(shares.weeklyPlanId, weeklyPlanId),
        eq(shares.sharedWithUserId, sharedWithUserId)
      )
    );
  if (existing.length > 0) {
    throw new Error("Bu plan zaten bu kullanıcıyla paylaşılmış");
  }

  await db.insert(shares).values({
    weeklyPlanId,
    ownerUserId: user.id,
    sharedWithUserId,
  });

  // Send notification to the shared-with user
  const [sharer] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, user.id));
  const [plan] = await db
    .select({ title: weeklyPlans.title })
    .from(weeklyPlans)
    .where(eq(weeklyPlans.id, weeklyPlanId));

  await sendNotification({
    userId: sharedWithUserId,
    type: "plan_shared",
    title: "Yeni Plan Paylaşımı",
    body: `${sharer.name} sizinle "${plan.title}" planını paylaştı.`,
    link: "/paylasilan",
    metadata: { weeklyPlanId, sharedByUserId: user.id },
  });

  revalidatePath("/ayarlar");
  revalidatePath("/paylasilan");
}

export async function revokeShare(shareId: number) {
  const user = await getAuthUser();

  const rows = await db
    .select({ id: shares.id, ownerUserId: shares.ownerUserId })
    .from(shares)
    .where(eq(shares.id, shareId));

  if (rows.length === 0) throw new Error("Paylaşım bulunamadı");
  if (rows[0].ownerUserId !== user.id) throw new Error("Unauthorized");

  await db.delete(shares).where(eq(shares.id, shareId));

  revalidatePath("/ayarlar");
  revalidatePath("/paylasilan");
}

export async function getMySharesForPlan(weeklyPlanId: number) {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);

  return db
    .select({
      id: shares.id,
      sharedWithUserId: shares.sharedWithUserId,
      sharedWithName: users.name,
      sharedWithEmail: users.email,
      createdAt: shares.createdAt,
    })
    .from(shares)
    .innerJoin(users, eq(shares.sharedWithUserId, users.id))
    .where(eq(shares.weeklyPlanId, weeklyPlanId));
}

export async function getPlansSharedWithMe() {
  const user = await getAuthUser();

  // A week is "active" if its Sunday end >= today, i.e. startDate >= today - 6 days.
  // Plans with null startDate are kept (legacy/unscheduled) so they remain visible.
  const today = getTurkeyTodayStr();
  const minStartDate = addDaysStr(today, -6);

  return db
    .select({
      shareId: shares.id,
      weeklyPlanId: weeklyPlans.id,
      weekNumber: weeklyPlans.weekNumber,
      title: weeklyPlans.title,
      phase: weeklyPlans.phase,
      startDate: weeklyPlans.startDate,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(shares)
    .innerJoin(weeklyPlans, eq(shares.weeklyPlanId, weeklyPlans.id))
    .innerJoin(users, eq(shares.ownerUserId, users.id))
    .where(
      and(
        eq(shares.sharedWithUserId, user.id),
        or(
          isNull(weeklyPlans.startDate),
          gte(weeklyPlans.startDate, minStartDate),
        ),
      ),
    );
}

export async function getShareableUsers() {
  const user = await getAuthUser();

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(and(eq(users.isApproved, true), ne(users.id, user.id)));
}
