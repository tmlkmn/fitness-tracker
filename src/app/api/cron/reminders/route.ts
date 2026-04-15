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

function isTimeInRange(current: string, start: string, end: string): boolean {
  const c = timeToMinutes(current);
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  return c >= s && c <= e;
}

function isIntervalHit(current: string, start: string, intervalMin: number): boolean {
  const c = timeToMinutes(current);
  const s = timeToMinutes(start);
  return (c - s) % intervalMin === 0;
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run membership expiry check once per day (at 09:00 Istanbul time)
  const istanbulTime = getCurrentTimeInTz("Europe/Istanbul");
  let membershipFired = 0;
  if (istanbulTime.hhmm === "09:00") {
    membershipFired = await checkMembershipExpiry();
  }

  const allReminders = await db
    .select({
      id: reminders.id,
      userId: reminders.userId,
      type: reminders.type,
      title: reminders.title,
      body: reminders.body,
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
    })
    .from(reminders)
    .leftJoin(
      notificationPreferences,
      eq(reminders.userId, notificationPreferences.userId)
    )
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
        if (isTimeInRange(hhmm, start, end) && isIntervalHit(hhmm, start, intMin)) {
          // Check lastFiredAt already done above
          await fireReminder(reminder);
          firedCount++;
        }
      } else if (reminder.time === hhmm) {
        await fireReminder(reminder);
        firedCount++;
      }
    } else if (reminder.type === "meal") {
      const firedMeals = await handleMealReminder(
        reminder,
        hhmm,
        dateStr
      );
      firedCount += firedMeals;
    } else if (reminder.type === "workout") {
      const workoutTime = reminder.defaultWorkoutTime ?? "19:00";
      const targetTime = subtractMinutes(
        workoutTime,
        reminder.minutesBefore ?? 10
      );
      if (targetTime === hhmm) {
        await sendNotification({
          userId: reminder.userId,
          type: "reminder_workout",
          title: reminder.title,
          body:
            reminder.body ??
            `${reminder.minutesBefore ?? 10} dk sonra antrenman zamanı!`,
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

  return NextResponse.json({ ok: true, fired: firedCount, membershipFired });
}

async function fireReminder(reminder: {
  id: number;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  skipEmail: boolean | null;
  recurrence: string;
}) {
  await sendNotification({
    userId: reminder.userId,
    type: `reminder_${reminder.type}`,
    title: reminder.title,
    body: reminder.body ?? reminder.title,
    link: "/ayarlar",
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
  },
  currentHhmm: string,
  dateStr: string
): Promise<number> {
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
    if (targetTime === currentHhmm) {
      await sendNotification({
        userId: reminder.userId,
        type: "reminder_meal",
        title: `${meal.mealLabel} Hatırlatıcı`,
        body: `${offset} dk sonra: ${meal.mealLabel}`,
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

    let title: string;
    let body: string;

    if (daysLeft <= 0) {
      title = "Üyelik Süreniz Doldu";
      body = "Üyelik süreniz doldu. Erişim için yöneticinizle iletişime geçin.";
    } else if (daysLeft <= 1) {
      title = "Üyeliğiniz Yarın Doluyor!";
      body = "Üyelik süreniz yarın doluyor. Kesintisiz erişim için yenileme talep edin.";
    } else if (daysLeft <= 3) {
      title = `Üyeliğiniz ${daysLeft} Gün İçinde Doluyor`;
      body = `Üyelik süreniz ${daysLeft} gün sonra doluyor. Yenileme için yöneticinize ulaşın.`;
    } else {
      title = "Üyelik Hatırlatması";
      body = `Üyelik süreniz ${daysLeft} gün sonra doluyor.`;
    }

    // In-app + push notification (skip email — we'll send a custom one)
    await sendNotification({
      userId: user.id,
      type: daysLeft <= 0 ? "membership_expired" : "membership_expiring",
      title,
      body,
      link: "/ayarlar",
      skipEmail: true,
    });

    // Custom email template
    const endDateStr = endDate.toLocaleDateString("tr-TR");
    try {
      await sendMembershipExpiryEmail(
        user.email,
        user.name,
        daysLeft,
        endDateStr
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
