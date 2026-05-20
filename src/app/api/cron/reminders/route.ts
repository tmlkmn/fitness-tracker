import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import {
  reminders,
  notificationPreferences,
  dailyPlans,
  weeklyPlans,
  meals,
  users,
} from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { sendNotification } from "@/lib/notifications";
import { sendMembershipExpiryEmail } from "@/lib/email";
import { normalizeLocale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";
import { getReminderTemplateText, isReminderTemplateKey } from "@/lib/reminder-templates";
import { getServerTranslator } from "@/lib/i18n-server";

async function getTodayDailyPlanIdForUser(
  userId: string,
): Promise<number | null> {
  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const todayStr = getTurkeyTodayStr();
  const [row] = await db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(weeklyPlans.id, dailyPlans.weeklyPlanId))
    .where(and(eq(weeklyPlans.userId, userId), eq(dailyPlans.date, todayStr)))
    .limit(1);
  return row?.id ?? null;
}

function getCurrentTimeInTz(timezone: string): { hhmm: string; dayOfWeek: number; dateStr: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hhmm = `${get("hour")}:${get("minute")}`;
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;

  const localDate = new Date(
    now.toLocaleString("en-US", { timeZone: timezone })
  );
  const dayOfWeek = localDate.getDay();

  return { hhmm, dayOfWeek, dateStr };
}

function subtractMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m - minutes;
  const adjusted = ((totalMin % 1440) + 1440) % 1440;
  const nh = Math.floor(adjusted / 60);
  const nm = adjusted % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function shouldFireToday(
  recurrence: string,
  dayOfWeek: number,
  daysOfWeek: number[] | null,
  onceDate: string | null,
  dateStr: string
): boolean {
  switch (recurrence) {
    case "daily":
    case "interval":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekends":
      return dayOfWeek === 0 || dayOfWeek === 6;
    case "custom":
      return Array.isArray(daysOfWeek) && daysOfWeek.includes(dayOfWeek);
    case "once":
      return onceDate === dateStr;
    default:
      return false;
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Cron runs every 5 min (vercel.json), so target times rarely line up with
// the firing minute exactly. A reminder at 09:03 must fire from the 09:05
// invocation. TOLERANCE_MIN is the look-back window: a target is "due" if it
// fell in [current - TOLERANCE_MIN + 1, current]. Keep this in sync with the
// cron schedule.
const TOLERANCE_MIN = 5;

function isDue(targetHhmm: string, currentHhmm: string): boolean {
  const t = timeToMinutes(targetHhmm);
  const c = timeToMinutes(currentHhmm);
  return c >= t && c - t < TOLERANCE_MIN;
}

function isTimeInRange(current: string, start: string, end: string): boolean {
  const c = timeToMinutes(current);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return c >= s && c <= e;
}

function isIntervalDue(current: string, start: string, intervalMin: number): boolean {
  const c = timeToMinutes(current);
  const s = timeToMinutes(start);
  if (c < s) return false;
  return (c - s) % intervalMin < TOLERANCE_MIN;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run membership + trial expiry checks once per day (at 09:00 Istanbul time)
  const istanbulTime = getCurrentTimeInTz("Europe/Istanbul");
  let membershipFired = 0;
  let trialFired = 0;
  if (isDue("09:00", istanbulTime.hhmm)) {
    membershipFired = await checkMembershipExpiry();
    trialFired = await checkTrialEnding();
  }

  const allReminders = await db
    .select({
      id: reminders.id,
      userId: reminders.userId,
      type: reminders.type,
      title: reminders.title,
      body: reminders.body,
      templateKey: reminders.templateKey,
      time: reminders.time,
      minutesBefore: reminders.minutesBefore,
      recurrence: reminders.recurrence,
      intervalMinutes: reminders.intervalMinutes,
      intervalStart: reminders.intervalStart,
      intervalEnd: reminders.intervalEnd,
      daysOfWeek: reminders.daysOfWeek,
      onceDate: reminders.onceDate,
      skipEmail: reminders.skipEmail,
      lastFiredAt: reminders.lastFiredAt,
      timezone: notificationPreferences.timezone,
      defaultWorkoutTime: notificationPreferences.defaultWorkoutTime,
      userLocale: users.locale,
    })
    .from(reminders)
    .leftJoin(
      notificationPreferences,
      eq(reminders.userId, notificationPreferences.userId)
    )
    .leftJoin(users, eq(reminders.userId, users.id))
    .where(eq(reminders.isEnabled, true));

  let firedCount = 0;

  for (const reminder of allReminders) {
    const tz = reminder.timezone ?? "Europe/Istanbul";
    const { hhmm, dayOfWeek, dateStr } = getCurrentTimeInTz(tz);

    if (
      !shouldFireToday(
        reminder.recurrence,
        dayOfWeek,
        reminder.daysOfWeek as number[] | null,
        reminder.onceDate,
        dateStr
      )
    ) {
      continue;
    }

    // Check lastFiredAt to prevent double-fire
    if (reminder.lastFiredAt) {
      const lastFired = getCurrentTimeInTz(tz);
      const lastFiredLocal = new Date(
        reminder.lastFiredAt.toLocaleString("en-US", { timeZone: tz })
      );
      const lastHhmm = `${String(lastFiredLocal.getHours()).padStart(2, "0")}:${String(lastFiredLocal.getMinutes()).padStart(2, "0")}`;
      const lastDate = `${lastFiredLocal.getFullYear()}-${String(lastFiredLocal.getMonth() + 1).padStart(2, "0")}-${String(lastFiredLocal.getDate()).padStart(2, "0")}`;
      if (lastHhmm === hhmm && lastDate === dateStr) {
        continue;
      }
      void lastFired; // suppress unused
    }

    if (reminder.type === "custom") {
      if (reminder.recurrence === "interval") {
        // Interval-based: fire every N minutes within start-end window
        const intMin = reminder.intervalMinutes ?? 60;
        const start = reminder.intervalStart ?? "08:00";
        const end = reminder.intervalEnd ?? "22:00";
        if (isTimeInRange(hhmm, start, end) && isIntervalDue(hhmm, start, intMin)) {
          // Check lastFiredAt already done above
          await fireReminder(reminder);
          firedCount++;
        }
      } else if (reminder.time && isDue(reminder.time, hhmm)) {
        await fireReminder(reminder);
        firedCount++;
      }
    } else if (reminder.type === "meal") {
      const firedMeals = await handleMealReminder(
        { ...reminder, userLocale: reminder.userLocale ?? null },
        hhmm,
        dateStr
      );
      firedCount += firedMeals;
    } else if (reminder.type === "workout") {
      const workoutTime = reminder.defaultWorkoutTime ?? "19:00";
      const minutes = reminder.minutesBefore ?? 10;
      const targetTime = subtractMinutes(workoutTime, minutes);
      if (isDue(targetTime, hhmm)) {
        const locale = normalizeLocale(reminder.userLocale);
        const t = await getServerTranslator(locale, "triggerNotifications.reminderWorkout");
        await sendNotification({
          userId: reminder.userId,
          type: "reminder_workout",
          title: reminder.title || t("title"),
          body: reminder.body ?? t("body", { minutes }),
          link: undefined,
          skipEmail: reminder.skipEmail ?? true,
        });
        await db
          .update(reminders)
          .set({ lastFiredAt: new Date() })
          .where(eq(reminders.id, reminder.id));
        firedCount++;

        if (reminder.recurrence === "once") {
          await db
            .update(reminders)
            .set({ isEnabled: false })
            .where(eq(reminders.id, reminder.id));
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    fired: firedCount,
    membershipFired,
    trialFired,
  });
}

async function fireReminder(reminder: {
  id: number;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  templateKey: string | null;
  userLocale: string | null;
  skipEmail: boolean | null;
  recurrence: string;
}) {
  // Re-render template-based reminders in the recipient's current locale so
  // a TR-created reminder shows up in EN after the user switches language.
  let title = reminder.title;
  let body = reminder.body ?? reminder.title;
  if (reminder.templateKey && isReminderTemplateKey(reminder.templateKey)) {
    const text = await getReminderTemplateText(
      reminder.templateKey,
      normalizeLocale(reminder.userLocale),
    );
    title = text.title;
    body = text.body;
  }

  // Readiness template routes the user straight to today's wellness tab
  // with the form auto-open via ?focus=readiness, so logging takes one tap.
  let link = "/ayarlar";
  if (reminder.templateKey === "readiness") {
    const locale = normalizeLocale(reminder.userLocale);
    const today = await getTodayDailyPlanIdForUser(reminder.userId);
    if (today != null) {
      link = locale === "en"
        ? `/en/day/${today}?focus=readiness`
        : `/tr/gun/${today}?focus=readiness`;
    }
  }

  await sendNotification({
    userId: reminder.userId,
    type: `reminder_${reminder.type}`,
    title,
    body,
    link,
    skipEmail: reminder.skipEmail ?? true,
  });

  await db
    .update(reminders)
    .set({ lastFiredAt: new Date() })
    .where(eq(reminders.id, reminder.id));

  if (reminder.recurrence === "once") {
    await db
      .update(reminders)
      .set({ isEnabled: false })
      .where(eq(reminders.id, reminder.id));
  }
}

async function handleMealReminder(
  reminder: {
    id: number;
    userId: string;
    title: string;
    body: string | null;
    minutesBefore: number | null;
    skipEmail: boolean | null;
    recurrence: string;
    userLocale: string | null;
  },
  currentHhmm: string,
  dateStr: string
): Promise<number> {
  const locale = normalizeLocale(reminder.userLocale);
  const tMeal = await getServerTranslator(locale, "triggerNotifications.reminderMeal");
  // Find today's daily plan for this user
  const todayPlans = await db
    .select({
      dailyPlanId: dailyPlans.id,
    })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(eq(weeklyPlans.userId, reminder.userId), eq(dailyPlans.date, dateStr))
    );

  if (todayPlans.length === 0) return 0;

  const todayMeals = await db
    .select({
      mealTime: meals.mealTime,
      mealLabel: meals.mealLabel,
    })
    .from(meals)
    .where(eq(meals.dailyPlanId, todayPlans[0].dailyPlanId));

  let fired = 0;
  const offset = reminder.minutesBefore ?? 10;

  for (const meal of todayMeals) {
    // Parse mealTime — might be "10:30" or "10:30-11:00"
    const mealTimeStr = meal.mealTime.split("-")[0].trim();
    if (!/^\d{2}:\d{2}$/.test(mealTimeStr)) continue;

    const targetTime = subtractMinutes(mealTimeStr, offset);
    if (isDue(targetTime, currentHhmm)) {
      await sendNotification({
        userId: reminder.userId,
        type: "reminder_meal",
        title: meal.mealLabel,
        body: tMeal("body", { minutes: offset, mealLabel: meal.mealLabel }),
        link: undefined,
        skipEmail: reminder.skipEmail ?? true,
      });
      fired++;
    }
  }

  if (fired > 0) {
    await db
      .update(reminders)
      .set({ lastFiredAt: new Date() })
      .where(eq(reminders.id, reminder.id));

    if (reminder.recurrence === "once") {
      await db
        .update(reminders)
        .set({ isEnabled: false })
        .where(eq(reminders.id, reminder.id));
    }
  }

  return fired;
}

async function checkMembershipExpiry(): Promise<number> {
  const now = new Date();

  // Query all approved users with a membership end date
  const usersWithMembership = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      membershipEndDate: users.membershipEndDate,
      membershipNotifiedAt: users.membershipNotifiedAt,
      locale: users.locale,
    })
    .from(users)
    .where(
      and(
        eq(users.isApproved, true),
        isNotNull(users.membershipEndDate)
      )
    );

  let fired = 0;

  for (const user of usersWithMembership) {
    if (!user.membershipEndDate || user.role === "admin") continue;

    const endDate = new Date(user.membershipEndDate);
    const daysLeft = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only notify at 7, 3, 1, 0 day thresholds
    if (daysLeft > 7) continue;
    if (daysLeft > 3 && daysLeft < 7) continue;
    if (daysLeft > 1 && daysLeft < 3) continue;

    // Rate-limit: max 1 notification per ~20 hours
    if (user.membershipNotifiedAt) {
      const hoursSinceLast =
        (now.getTime() - new Date(user.membershipNotifiedAt).getTime()) /
        (1000 * 60 * 60);
      if (hoursSinceLast < 20) continue;
    }

    const userLocale = normalizeLocale(user.locale);
    const namespaceKey =
      daysLeft <= 0
        ? "membershipExpired"
        : daysLeft <= 1
          ? "membershipExpiring1d"
          : daysLeft <= 3
            ? "membershipExpiring3d"
            : "membershipExpiring7d";
    const tExpiry = await getServerTranslator(
      userLocale,
      `triggerNotifications.${namespaceKey}`,
    );

    // In-app + push notification (skip email — we'll send a custom one)
    await sendNotification({
      userId: user.id,
      type: daysLeft <= 0 ? "membership_expired" : "membership_expiring",
      title: tExpiry("title"),
      body: tExpiry("body"),
      link: userLocale === "en" ? "/en/settings" : "/tr/ayarlar",
      skipEmail: true,
    });

    // Custom email template
    const endDateStr = formatDate(endDate, userLocale);
    try {
      await sendMembershipExpiryEmail(
        user.email,
        user.name,
        daysLeft,
        endDateStr,
        userLocale,
      );
    } catch {
      // Email failure shouldn't block notification tracking
    }

    await db
      .update(users)
      .set({ membershipNotifiedAt: now })
      .where(eq(users.id, user.id));

    fired++;
  }

  return fired;
}

async function checkTrialEnding(): Promise<number> {
  const now = new Date();

  const trialUsers = await db
    .select({
      id: users.id,
      role: users.role,
      trialEndsAt: users.trialEndsAt,
      trialNotifiedAt: users.trialNotifiedAt,
      locale: users.locale,
    })
    .from(users)
    .where(
      and(
        eq(users.subscriptionStatus, "trialing"),
        isNotNull(users.trialEndsAt),
      ),
    );

  let fired = 0;

  for (const user of trialUsers) {
    if (!user.trialEndsAt || user.role === "admin") continue;

    const daysLeft = Math.ceil(
      (new Date(user.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Only notify at 7, 3, 1, 0 day thresholds
    if (daysLeft > 7) continue;
    if (daysLeft > 3 && daysLeft < 7) continue;
    if (daysLeft > 1 && daysLeft < 3) continue;

    // Rate-limit: max 1 notification per ~20 hours
    if (user.trialNotifiedAt) {
      const hoursSinceLast =
        (now.getTime() - new Date(user.trialNotifiedAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < 20) continue;
    }

    const userLocale = normalizeLocale(user.locale);
    const isOver = daysLeft <= 0;
    const tTrial = await getServerTranslator(
      userLocale,
      isOver
        ? "triggerNotifications.trialEnded"
        : "triggerNotifications.trialEnding",
    );

    await sendNotification({
      userId: user.id,
      type: isOver ? "trial_ended" : "trial_ending",
      title: tTrial("title"),
      body: isOver ? tTrial("body") : tTrial("body", { daysLeft }),
      link: userLocale === "en" ? "/en/pricing" : "/tr/fiyatlandirma",
      skipEmail: false,
    });

    await db
      .update(users)
      .set({
        trialNotifiedAt: now,
        // Make the lapsed state explicit so admin views + entitlement agree.
        ...(isOver ? { subscriptionStatus: "expired" as const } : {}),
      })
      .where(eq(users.id, user.id));

    fired++;
  }

  return fired;
}
