"use server";

import { db } from "@/db";
import { shares, weeklyPlans, users } from "@/db/schema";
import { eq, and, gte, or, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { verifyWeeklyPlanOwnership } from "@/lib/ownership";
import {
  findRecipientByEmail,
  isShareErrorCode,
  previousShareRecipients,
  shareWeekWith,
  type ShareErrorCode,
} from "@/lib/sharing";
import { addDaysStr, getTurkeyTodayStr } from "@/lib/utils";

export type ShareTarget = { userId: string } | { email: string };

export type ShareResult =
  | { ok: true }
  | { ok: false; error: ShareErrorCode | "RATE_LIMITED"; retryAfter?: number };

/**
 * Shares the user's week read-only with someone they name by e-mail, or with a
 * person they shared with before (`getShareableUsers`). Business-rule failures
 * come back as `{ ok: false, error }` — a thrown message would not reach the
 * browser in production.
 */
export async function shareWeeklyPlan(weeklyPlanId: number, target: ShareTarget): Promise<ShareResult> {
  const user = await getAuthUser();
  await verifyWeeklyPlanOwnership(weeklyPlanId, user.id);
  try {
    const recipientId =
      "email" in target ? await findRecipientByEmail(user, target.email) : target.userId;
    await shareWeekWith(user.id, weeklyPlanId, recipientId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (isShareErrorCode(message)) return { ok: false, error: message };
    const rate = /^RATE_LIMITED:(\d+)$/.exec(message);
    if (rate) return { ok: false, error: "RATE_LIMITED", retryAfter: Number(rate[1]) };
    throw err;
  }
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

/**
 * People the user has shared a plan with before — for one-tap sharing. Never
 * the whole user list: other recipients are found by e-mail only.
 */
export async function getShareableUsers() {
  const user = await getAuthUser();
  return previousShareRecipients(user.id);
}
