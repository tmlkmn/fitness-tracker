import { db } from "@/db";
import {
  users,
  userFoods,
  weeklyPlans,
  dailyPlans,
  meals,
  exercises,
  supplements,
  supplementCompletions,
  shoppingLists,
  progressLogs,
  shares,
  sessions,
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
  cookieConsents,
  invoices,
} from "@/db/schema";
import { eq, inArray, or } from "drizzle-orm";

/**
 * Gathers every row of personal data the app holds for a user, for the
 * GDPR "right of access" export. Returns a plain object ready to serialize
 * as JSON. System/cache tables (webhook_events, audit_logs, exercise demos)
 * and the credential hash in `account` are intentionally excluded.
 */
export async function collectUserExport(
  userId: string,
): Promise<Record<string, unknown>> {
  const [account] = await db.select().from(users).where(eq(users.id, userId));

  // Plan content is keyed indirectly: weeklyPlans → dailyPlans → meals/exercises.
  const plans = await db
    .select()
    .from(weeklyPlans)
    .where(eq(weeklyPlans.userId, userId));
  const planIds = plans.map((p) => p.id);

  const days = planIds.length
    ? await db
        .select()
        .from(dailyPlans)
        .where(inArray(dailyPlans.weeklyPlanId, planIds))
    : [];
  const dayIds = days.map((d) => d.id);

  const mealRows = dayIds.length
    ? await db.select().from(meals).where(inArray(meals.dailyPlanId, dayIds))
    : [];
  const exerciseRows = dayIds.length
    ? await db
        .select()
        .from(exercises)
        .where(inArray(exercises.dailyPlanId, dayIds))
    : [];
  const supplementRows = planIds.length
    ? await db
        .select()
        .from(supplements)
        .where(inArray(supplements.weeklyPlanId, planIds))
    : [];
  const shoppingRows = planIds.length
    ? await db
        .select()
        .from(shoppingLists)
        .where(inArray(shoppingLists.weeklyPlanId, planIds))
    : [];

  // The encrypted national ID is ciphertext — useless in an export and best
  // left out of a downloadable file.
  const profile = account
    ? (() => {
        const { iyzicoIdentityNumber: _omit, ...rest } = account;
        void _omit;
        return rest;
      })()
    : null;

  return {
    exportedAt: new Date().toISOString(),
    profile,
    weeklyPlans: plans,
    dailyPlans: days,
    meals: mealRows,
    exercises: exerciseRows,
    supplements: supplementRows,
    shoppingLists: shoppingRows,
    customFoods: await db
      .select()
      .from(userFoods)
      .where(eq(userFoods.userId, userId)),
    supplementCompletions: await db
      .select()
      .from(supplementCompletions)
      .where(eq(supplementCompletions.userId, userId)),
    progressLogs: await db
      .select()
      .from(progressLogs)
      .where(eq(progressLogs.userId, userId)),
    shares: await db
      .select()
      .from(shares)
      .where(
        or(eq(shares.ownerUserId, userId), eq(shares.sharedWithUserId, userId)),
      ),
    sessions: await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId)),
    notifications: await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId)),
    pushSubscriptions: await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId)),
    notificationPreferences: await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId)),
    reminders: await db
      .select()
      .from(reminders)
      .where(eq(reminders.userId, userId)),
    exerciseTips: await db
      .select()
      .from(exerciseTips)
      .where(eq(exerciseTips.userId, userId)),
    exerciseAlternatives: await db
      .select()
      .from(exerciseAlternatives)
      .where(eq(exerciseAlternatives.userId, userId)),
    aiUsageLogs: await db
      .select()
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.userId, userId)),
    aiPlanSuggestions: await db
      .select()
      .from(aiPlanSuggestions)
      .where(eq(aiPlanSuggestions.userId, userId)),
    aiDailyMealSuggestions: await db
      .select()
      .from(aiDailyMealSuggestions)
      .where(eq(aiDailyMealSuggestions.userId, userId)),
    savedMealSuggestions: await db
      .select()
      .from(savedMealSuggestions)
      .where(eq(savedMealSuggestions.userId, userId)),
    chatMessages: await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId)),
    feedbacks: await db
      .select()
      .from(feedbacks)
      .where(eq(feedbacks.userId, userId)),
    waterLogs: await db
      .select()
      .from(waterLogs)
      .where(eq(waterLogs.userId, userId)),
    sleepLogs: await db
      .select()
      .from(sleepLogs)
      .where(eq(sleepLogs.userId, userId)),
    readinessLogs: await db
      .select()
      .from(readinessLogs)
      .where(eq(readinessLogs.userId, userId)),
    dailyGreetings: await db
      .select()
      .from(dailyGreetings)
      .where(eq(dailyGreetings.userId, userId)),
    cookieConsents: await db
      .select()
      .from(cookieConsents)
      .where(eq(cookieConsents.userId, userId)),
    invoices: await db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId)),
  };
}
