"use server";

import { db } from "@/db";
import {
  users,
  userFoods,
  weeklyPlans,
  supplementCompletions,
  progressLogs,
  shares,
  sessions,
  accounts,
  notifications,
  pushSubscriptions,
  notificationPreferences,
  reminders,
  exerciseTips,
  exerciseAlternatives,
  aiUsageLogs,
  aiPlanSuggestions,
  aiDailyMealSuggestions,
  savedMealSuggestions,
  chatMessages,
  feedbacks,
  waterLogs,
  sleepLogs,
  readinessLogs,
  dailyGreetings,
} from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-utils";
import { cancelLsSubscription } from "@/lib/billing/lemonsqueezy";
import { cancelIyzicoSubscription } from "@/lib/billing/iyzico";
import { getEntitlement } from "@/lib/billing/entitlement";
import { logAudit } from "@/lib/audit";

/**
 * GDPR "right to erasure". Permanently removes all personal content, cancels
 * any active subscription, and anonymizes the `user` row.
 *
 * The `user` row is anonymized rather than deleted, and `invoices` are kept:
 * financial records carry a multi-year legal retention obligation that
 * outlives the account, and `invoices`/`audit_logs`/`cookie_consents`
 * foreign-key the user row.
 *
 * Caller must pass their own e-mail verbatim — a deliberate friction step,
 * since the action is irreversible.
 */
export async function deleteMyAccount(
  confirmEmail: string,
): Promise<{ success: true }> {
  const user = await getAuthSession();

  const [row] = await db.select().from(users).where(eq(users.id, user.id));
  if (!row) throw new Error("Unauthorized");

  if (confirmEmail.trim().toLowerCase() !== row.email.toLowerCase()) {
    throw new Error("EmailMismatch");
  }

  // Cancel an active subscription first — a deleted account can no longer
  // manage one, so an uncancelled subscription would keep charging silently.
  const entitlement = getEntitlement(row);
  if (entitlement.isActive) {
    if (row.billingProvider === "lemonsqueezy" && row.lemonSqueezySubscriptionId) {
      await cancelLsSubscription(row.lemonSqueezySubscriptionId);
    } else if (row.billingProvider === "iyzico" && row.iyzicoSubscriptionRef) {
      await cancelIyzicoSubscription(row.iyzicoSubscriptionRef);
    }
  }

  const uid = user.id;

  // Delete all personal content. weeklyPlans cascades to dailyPlans → meals/
  // exercises, supplements and shoppingLists. invoices, audit_logs and
  // cookie_consents are intentionally retained (legal records).
  await db
    .delete(shares)
    .where(or(eq(shares.ownerUserId, uid), eq(shares.sharedWithUserId, uid)));
  await db.delete(weeklyPlans).where(eq(weeklyPlans.userId, uid));
  await db.delete(userFoods).where(eq(userFoods.userId, uid));
  await db
    .delete(supplementCompletions)
    .where(eq(supplementCompletions.userId, uid));
  await db.delete(progressLogs).where(eq(progressLogs.userId, uid));
  await db.delete(notifications).where(eq(notifications.userId, uid));
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, uid));
  await db
    .delete(notificationPreferences)
    .where(eq(notificationPreferences.userId, uid));
  await db.delete(reminders).where(eq(reminders.userId, uid));
  await db.delete(exerciseTips).where(eq(exerciseTips.userId, uid));
  await db
    .delete(exerciseAlternatives)
    .where(eq(exerciseAlternatives.userId, uid));
  await db.delete(aiUsageLogs).where(eq(aiUsageLogs.userId, uid));
  await db.delete(aiPlanSuggestions).where(eq(aiPlanSuggestions.userId, uid));
  await db
    .delete(aiDailyMealSuggestions)
    .where(eq(aiDailyMealSuggestions.userId, uid));
  await db
    .delete(savedMealSuggestions)
    .where(eq(savedMealSuggestions.userId, uid));
  await db.delete(chatMessages).where(eq(chatMessages.userId, uid));
  await db.delete(feedbacks).where(eq(feedbacks.userId, uid));
  await db.delete(waterLogs).where(eq(waterLogs.userId, uid));
  await db.delete(sleepLogs).where(eq(sleepLogs.userId, uid));
  await db.delete(readinessLogs).where(eq(readinessLogs.userId, uid));
  await db.delete(dailyGreetings).where(eq(dailyGreetings.userId, uid));

  // Drop credentials and sessions — login becomes impossible.
  await db.delete(sessions).where(eq(sessions.userId, uid));
  await db.delete(accounts).where(eq(accounts.userId, uid));

  // Anonymize the surviving user row.
  await db
    .update(users)
    .set({
      name: "Silinmiş Kullanıcı",
      email: `deleted-${uid}@fitmusc.invalid`,
      emailVerified: false,
      image: null,
      height: null,
      weight: null,
      targetWeight: null,
      healthNotes: null,
      foodAllergens: null,
      dailyRoutine: null,
      weekendRoutine: null,
      supplementSchedule: null,
      fitnessLevel: null,
      fitnessGoal: null,
      sportHistory: null,
      currentMedications: null,
      age: null,
      gender: null,
      dailyActivityLevel: null,
      targetCalories: null,
      targetProteinG: null,
      targetCarbsG: null,
      targetFatG: null,
      hasEatingDisorderHistory: false,
      isPregnantOrBreastfeeding: false,
      hasDiabetes: false,
      hasThyroidCondition: false,
      membershipType: null,
      membershipStartDate: null,
      membershipEndDate: null,
      membershipNotifiedAt: null,
      lemonSqueezyCustomerId: null,
      lemonSqueezySubscriptionId: null,
      iyzicoCustomerRef: null,
      iyzicoSubscriptionRef: null,
      iyzicoIdentityNumber: null,
      billingAddress: null,
      taxNumber: null,
      billingTier: null,
      billingInterval: null,
      billingProvider: null,
      subscriptionStatus: "expired",
      trialEndsAt: null,
      trialNotifiedAt: null,
      nextBillingDate: null,
      paymentFailedAt: null,
      cancelledAt: new Date(),
      isApproved: false,
      banned: true,
      banReason: "account_deleted",
      mustChangePassword: false,
      hasSeenOnboarding: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, uid));

  logAudit({
    userId: uid,
    action: "account.delete",
    entityType: "user",
    entityId: uid,
  }).catch(() => {});

  return { success: true };
}
