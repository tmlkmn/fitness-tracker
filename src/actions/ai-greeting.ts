"use server";

import { db } from "@/db";
import {
  dailyGreetings,
  dailyPlans,
  exercises,
  meals,
  sleepLogs,
  users,
  waterLogs,
  weeklyPlans,
} from "@/db/schema";
import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth-utils";
import { getUserLocale, type Locale } from "@/lib/locale";
import {
  AI_MODELS,
  PROMPT_VERSION,
  checkRateLimit,
  discriminateAiError,
  getAIClient,
  logAiUsage,
} from "@/lib/ai";
import { getDailyGreetingPrompt } from "@/lib/ai-prompts";
import { addDaysStr, getTurkeyTodayStr } from "@/lib/utils";
import { getActivityStats } from "@/actions/activity-stats";

export interface DailyGreeting {
  message: string;
  firstName: string;
  cached: boolean;
}

type TimeOfDay = "morning" | "afternoon" | "evening";
type DayKind = "workout" | "swimming" | "rest" | "nutrition" | "none";

function getTurkeyNow(): Date {
  const nowUtc = new Date();
  const turkeyOffset = 3 * 60 * 60 * 1000;
  return new Date(nowUtc.getTime() + turkeyOffset);
}

function timeOfDay(hour: number): TimeOfDay {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function greetingPhrase(t: TimeOfDay, locale: Locale): string {
  if (locale === "en") {
    return t === "morning" ? "Good morning" : t === "afternoon" ? "Good afternoon" : "Good evening";
  }
  return t === "morning" ? "Günaydın" : t === "afternoon" ? "İyi günler" : "İyi akşamlar";
}

function fallbackMessage(t: TimeOfDay, locale: Locale, dayKind: DayKind): string {
  if (locale === "en") {
    if (dayKind === "workout") return "Today is a training day — show up and trust the process.";
    if (dayKind === "rest") return "Today is rest — focus on quality food and hydration to recover well.";
    if (t === "morning") return "Have a strong start to your day.";
    if (t === "afternoon") return "Hope your day is going well so far.";
    return "Almost done with today — keep it up.";
  }
  if (dayKind === "workout") return "Bugün antrenman günü — bahaneye yer yok, sürecine güven ve başla.";
  if (dayKind === "rest") return "Bugün dinlenme günü — beslenmene ve suya odaklan, vücudun toparlansın.";
  if (t === "morning") return "Güne güçlü bir başlangıç yap.";
  if (t === "afternoon") return "Gününün geri kalanı iyi geçsin.";
  return "Bugünü tamamlamana az kaldı, devam et.";
}

async function fetchWeekCounts(
  userId: string,
  fromDate: string,
  toDateExclusive: string,
): Promise<{ workouts: number; mealsCompleted: number }> {
  const [workoutRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(exercises)
    .innerJoin(dailyPlans, eq(exercises.dailyPlanId, dailyPlans.id))
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, userId),
        eq(exercises.isCompleted, true),
        isNotNull(dailyPlans.date),
        gte(dailyPlans.date, fromDate),
        lt(dailyPlans.date, toDateExclusive),
      ),
    );

  const [mealRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(meals)
    .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, userId),
        eq(meals.isCompleted, true),
        isNotNull(dailyPlans.date),
        gte(dailyPlans.date, fromDate),
        lt(dailyPlans.date, toDateExclusive),
      ),
    );

  return {
    workouts: Number(workoutRow?.n ?? 0),
    mealsCompleted: Number(mealRow?.n ?? 0),
  };
}

async function fetchTodayPlanType(userId: string, today: string): Promise<DayKind> {
  const [row] = await db
    .select({ planType: dailyPlans.planType })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(and(eq(weeklyPlans.userId, userId), eq(dailyPlans.date, today)))
    .limit(1);

  const pt = row?.planType;
  if (pt === "workout" || pt === "swimming" || pt === "rest" || pt === "nutrition") return pt;
  return "none";
}

async function fetchWaterToday(
  userId: string,
  today: string,
): Promise<{ glasses: number; target: number } | null> {
  const [row] = await db
    .select({ glasses: waterLogs.glasses, target: waterLogs.targetGlasses })
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), eq(waterLogs.logDate, today)))
    .limit(1);
  if (!row) return null;
  return { glasses: Number(row.glasses), target: Number(row.target) };
}

async function fetchSleepLastNight(
  userId: string,
  today: string,
): Promise<{ durationMinutes: number | null; quality: number | null } | null> {
  // "Last night" = log_date = today (most apps log the wake date)
  const [row] = await db
    .select({ durationMinutes: sleepLogs.durationMinutes, quality: sleepLogs.quality })
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, userId), eq(sleepLogs.logDate, today)))
    .limit(1);
  if (!row) return null;
  return {
    durationMinutes: row.durationMinutes == null ? null : Number(row.durationMinutes),
    quality: row.quality == null ? null : Number(row.quality),
  };
}

// Monday in Turkey timezone? getDay returns 0 (Sun) .. 6 (Sat).
function turkeyIsMonday(): boolean {
  const t = getTurkeyNow();
  return t.getUTCDay() === 1;
}

// Inclusive Monday of the ISO week containing the given YYYY-MM-DD.
function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const dow = d.getDay(); // 0..6
  const shift = dow === 0 ? -6 : 1 - dow; // Sunday → -6, Mon → 0, Tue → -1, ...
  return addDaysStr(dateStr, shift);
}

interface GreetingContext {
  firstName: string;
  locale: Locale;
  timeOfDay: TimeOfDay;
  greetingPhrase: string;
  dayKind: DayKind;
  isMonday: boolean;
  streak: number;
  weekWorkouts: number;
  weekMeals: number;
  lastWeekWorkouts: number | null;
  lastWeekMeals: number | null;
  water: { glasses: number; target: number } | null;
  sleep: { durationMinutes: number | null; quality: number | null } | null;
  currentWeight: number | null;
  targetWeight: number | null;
}

function buildContextMessage(ctx: GreetingContext): string {
  const lines: string[] = [];
  const en = ctx.locale === "en";

  const dayKindLabel = (k: DayKind): string => {
    if (en) {
      if (k === "workout") return "training day";
      if (k === "swimming") return "swimming day";
      if (k === "rest") return "rest day";
      if (k === "nutrition") return "nutrition-focused day (no training)";
      return "no plan scheduled for today";
    }
    if (k === "workout") return "antrenman günü";
    if (k === "swimming") return "yüzme günü";
    if (k === "rest") return "dinlenme günü";
    if (k === "nutrition") return "beslenme odaklı gün (antrenman yok)";
    return "bugün için planlı bir gün yok";
  };

  if (en) {
    lines.push(`First name: ${ctx.firstName}`);
    lines.push(`Time-of-day greeting (already shown to user separately, do not repeat): ${ctx.greetingPhrase}`);
    lines.push(`Today is: ${dayKindLabel(ctx.dayKind)}`);
    lines.push(`Is Monday (start of week): ${ctx.isMonday ? "yes" : "no"}`);
    lines.push(`Current streak (days): ${ctx.streak}`);
    lines.push(`Workouts completed this week (Mon–today): ${ctx.weekWorkouts}`);
    lines.push(`Meals completed this week (Mon–today): ${ctx.weekMeals}`);
    if (ctx.isMonday && ctx.lastWeekWorkouts != null && ctx.lastWeekMeals != null) {
      lines.push(`Last week's totals: ${ctx.lastWeekWorkouts} workouts, ${ctx.lastWeekMeals} meals completed`);
    }
    if (ctx.water) lines.push(`Water today: ${ctx.water.glasses}/${ctx.water.target} glasses`);
    else lines.push(`Water today: not logged yet`);
    if (ctx.sleep && ctx.sleep.durationMinutes != null) {
      const hours = (ctx.sleep.durationMinutes / 60).toFixed(1);
      const q = ctx.sleep.quality != null ? `, quality ${ctx.sleep.quality}/5` : "";
      lines.push(`Last night's sleep: ${hours}h${q}`);
    } else {
      lines.push(`Last night's sleep: not logged`);
    }
    if (ctx.currentWeight != null) lines.push(`Current weight: ${ctx.currentWeight} kg`);
    if (ctx.targetWeight != null) lines.push(`Target weight: ${ctx.targetWeight} kg`);
    if (ctx.currentWeight != null && ctx.targetWeight != null) {
      lines.push(`Distance to target: ${(ctx.currentWeight - ctx.targetWeight).toFixed(1)} kg`);
    }
    lines.push("");
    lines.push("Write the message BODY only (do NOT include any greeting like \"Hello\" or the user's name — that line is rendered separately by the UI). 1-2 short sentences, plain text only.");
  } else {
    lines.push(`İlk ad: ${ctx.firstName}`);
    lines.push(`Saat selamı (kullanıcıya ayrı satırda zaten gösterildi, mesajda tekrar etme): ${ctx.greetingPhrase}`);
    lines.push(`Bugün: ${dayKindLabel(ctx.dayKind)}`);
    lines.push(`Pazartesi mi (hafta başı): ${ctx.isMonday ? "evet" : "hayır"}`);
    lines.push(`Mevcut streak (gün): ${ctx.streak}`);
    lines.push(`Bu hafta tamamlanan antrenman (Pzt–bugün): ${ctx.weekWorkouts}`);
    lines.push(`Bu hafta tamamlanan öğün (Pzt–bugün): ${ctx.weekMeals}`);
    if (ctx.isMonday && ctx.lastWeekWorkouts != null && ctx.lastWeekMeals != null) {
      lines.push(`Geçen hafta toplam: ${ctx.lastWeekWorkouts} antrenman, ${ctx.lastWeekMeals} öğün tamamlandı`);
    }
    if (ctx.water) lines.push(`Bugün su: ${ctx.water.glasses}/${ctx.water.target} bardak`);
    else lines.push(`Bugün su: henüz girilmedi`);
    if (ctx.sleep && ctx.sleep.durationMinutes != null) {
      const hours = (ctx.sleep.durationMinutes / 60).toFixed(1);
      const q = ctx.sleep.quality != null ? `, kalite ${ctx.sleep.quality}/5` : "";
      lines.push(`Dün gece uyku: ${hours} saat${q}`);
    } else {
      lines.push(`Dün gece uyku: girilmemiş`);
    }
    if (ctx.currentWeight != null) lines.push(`Şu anki kilo: ${ctx.currentWeight} kg`);
    if (ctx.targetWeight != null) lines.push(`Hedef kilo: ${ctx.targetWeight} kg`);
    if (ctx.currentWeight != null && ctx.targetWeight != null) {
      lines.push(`Hedefe uzaklık: ${(ctx.currentWeight - ctx.targetWeight).toFixed(1)} kg`);
    }
    lines.push("");
    lines.push("Sadece mesajın GÖVDESİNİ yaz (\"Merhaba\" veya kullanıcı adı YAZMA — bu satır UI'da ayrı gösteriliyor). 1-2 kısa cümle, sadece düz metin.");
  }
  return lines.join("\n");
}

function sanitizeAiMessage(raw: string, firstName: string): string {
  let text = raw.trim();
  if (text.startsWith('"') && text.endsWith('"') && text.length > 1) {
    text = text.slice(1, -1).trim();
  }
  text = text.replace(/\s+/g, " ");
  // If AI ignored instructions and prepended a greeting + name, strip it.
  const greetingPrefixes = [
    new RegExp(`^(merhaba|selam|günaydın|iyi günler|iyi akşamlar|hello|hi|hey|good morning|good afternoon|good evening)[,!\\s]+${firstName}[,!.\\s]+`, "i"),
    new RegExp(`^${firstName}[,!.\\s]+`, "i"),
  ];
  for (const re of greetingPrefixes) text = text.replace(re, "");
  text = text.trim();
  if (text.length > 0) text = text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1);
  if (text.length > 280) text = text.slice(0, 277).trimEnd() + "…";
  return text;
}

export async function getDailyGreeting(): Promise<DailyGreeting> {
  const user = await getAuthUser();
  const locale = getUserLocale(user as { locale?: string | null });
  const today = getTurkeyTodayStr();

  const fullName = (user as { name?: string | null }).name ?? "";
  const firstName = fullName.split(" ")[0] || (locale === "en" ? "there" : "dostum");

  const [cached] = await db
    .select({ message: dailyGreetings.message })
    .from(dailyGreetings)
    .where(
      and(
        eq(dailyGreetings.userId, user.id),
        eq(dailyGreetings.date, today),
        eq(dailyGreetings.locale, locale),
      ),
    )
    .limit(1);

  if (cached?.message) {
    return { message: cached.message, firstName, cached: true };
  }

  const turkeyNow = getTurkeyNow();
  const tod = timeOfDay(turkeyNow.getUTCHours());
  const hello = greetingPhrase(tod, locale);
  const isMonday = turkeyIsMonday();

  let message: string;

  try {
    await checkRateLimit(user.id, "greeting");
  } catch {
    const dayKindForFallback = await fetchTodayPlanType(user.id, today);
    message = fallbackMessage(tod, locale, dayKindForFallback);
    await persistGreeting(user.id, today, locale, message);
    return { message, firstName, cached: false };
  }

  const [profileRow] = await db
    .select({ weight: users.weight, targetWeight: users.targetWeight })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const currentWeight = profileRow?.weight != null ? Number(profileRow.weight) : null;
  const targetWeight = profileRow?.targetWeight != null ? Number(profileRow.targetWeight) : null;

  let streak = 0;
  try {
    const stats = await getActivityStats();
    streak = stats.currentStreak;
  } catch {
    streak = 0;
  }

  const monday = mondayOf(today);
  const tomorrow = addDaysStr(today, 1);
  const lastWeekStart = addDaysStr(monday, -7);

  const [thisWeek, lastWeekOpt, dayKind, water, sleep] = await Promise.all([
    fetchWeekCounts(user.id, monday, tomorrow),
    isMonday ? fetchWeekCounts(user.id, lastWeekStart, monday) : Promise.resolve(null),
    fetchTodayPlanType(user.id, today),
    fetchWaterToday(user.id, today),
    fetchSleepLastNight(user.id, today),
  ]);

  const ctx: GreetingContext = {
    firstName,
    locale,
    timeOfDay: tod,
    greetingPhrase: hello,
    dayKind,
    isMonday,
    streak,
    weekWorkouts: thisWeek.workouts,
    weekMeals: thisWeek.mealsCompleted,
    lastWeekWorkouts: lastWeekOpt?.workouts ?? null,
    lastWeekMeals: lastWeekOpt?.mealsCompleted ?? null,
    water,
    sleep,
    currentWeight,
    targetWeight,
  };

  const userContext = buildContextMessage(ctx);

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const client = getAIClient();
    const response = await client.messages.create({
      model: AI_MODELS.fast,
      max_tokens: 160,
      system: [
        {
          type: "text",
          text: getDailyGreetingPrompt(locale),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContext }],
    });

    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
    const clean = sanitizeAiMessage(raw, firstName);
    message = clean || fallbackMessage(tod, locale, dayKind);

    await logAiUsage(user.id, "greeting", {
      status: "success",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });
  } catch (error) {
    const { status, errorMessage } = discriminateAiError(error);
    await logAiUsage(user.id, "greeting", {
      status,
      errorMessage,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - startTime,
      model: AI_MODELS.fast,
      promptVersion: PROMPT_VERSION,
    });
    message = fallbackMessage(tod, locale, dayKind);
  }

  await persistGreeting(user.id, today, locale, message);
  return { message, firstName, cached: false };
}

async function persistGreeting(
  userId: string,
  date: string,
  locale: Locale,
  message: string,
): Promise<void> {
  try {
    await db
      .insert(dailyGreetings)
      .values({ userId, date, locale, message })
      .onConflictDoNothing();
  } catch {
    // best-effort cache; ignore
  }
}
