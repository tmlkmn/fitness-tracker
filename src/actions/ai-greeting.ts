"use server";

import { db } from "@/db";
import { dailyGreetings, dailyPlans, exercises, meals, users, weeklyPlans } from "@/db/schema";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
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
  cached: boolean;
}

type TimeOfDay = "morning" | "afternoon" | "evening";

function getTurkeyHour(): number {
  const nowUtc = new Date();
  const turkeyOffset = 3 * 60 * 60 * 1000;
  const turkeyNow = new Date(nowUtc.getTime() + turkeyOffset);
  return turkeyNow.getUTCHours();
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

function fallbackMessage(
  firstName: string,
  t: TimeOfDay,
  locale: Locale,
): string {
  const hello = greetingPhrase(t, locale);
  if (locale === "en") {
    if (t === "morning") return `${hello}, ${firstName}! Have a great day ahead.`;
    if (t === "afternoon") return `${hello}, ${firstName}! Hope your day is going well.`;
    return `${hello}, ${firstName}! Almost done — keep it up.`;
  }
  if (t === "morning") return `${hello} ${firstName}! Bugün de harika bir gün olsun.`;
  if (t === "afternoon") return `${hello} ${firstName}! Günün nasıl gidiyor?`;
  return `${hello} ${firstName}! Bugünü tamamlamaya az kaldı.`;
}

async function fetchWeekCounts(
  userId: string,
  today: string,
): Promise<{ workouts: number; mealsCompleted: number }> {
  const weekStart = addDaysStr(today, -6);

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
        gte(dailyPlans.date, weekStart),
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
        gte(dailyPlans.date, weekStart),
      ),
    );

  return {
    workouts: Number(workoutRow?.n ?? 0),
    mealsCompleted: Number(mealRow?.n ?? 0),
  };
}

function buildContextMessage(input: {
  firstName: string;
  greetingPhrase: string;
  locale: Locale;
  weekWorkouts: number;
  weekMeals: number;
  streak: number;
  currentWeight: number | null;
  targetWeight: number | null;
}): string {
  const {
    firstName,
    greetingPhrase: hello,
    locale,
    weekWorkouts,
    weekMeals,
    streak,
    currentWeight,
    targetWeight,
  } = input;

  const lines: string[] = [];
  if (locale === "en") {
    lines.push(`First name: ${firstName}`);
    lines.push(`Time-of-day greeting to start with: ${hello}`);
    lines.push(`Workouts completed this week: ${weekWorkouts}`);
    lines.push(`Meals completed this week: ${weekMeals}`);
    lines.push(`Current streak (days): ${streak}`);
    if (currentWeight != null) lines.push(`Current weight: ${currentWeight} kg`);
    if (targetWeight != null) lines.push(`Target weight: ${targetWeight} kg`);
    if (currentWeight != null && targetWeight != null) {
      lines.push(`Distance to target: ${(currentWeight - targetWeight).toFixed(1)} kg`);
    }
    lines.push("");
    lines.push("Write the greeting now. 1-2 short sentences, plain text only.");
  } else {
    lines.push(`İlk ad: ${firstName}`);
    lines.push(`Başlangıçta kullanılacak saat selamı: ${hello}`);
    lines.push(`Bu hafta tamamlanan antrenman: ${weekWorkouts}`);
    lines.push(`Bu hafta tamamlanan öğün: ${weekMeals}`);
    lines.push(`Mevcut streak (gün): ${streak}`);
    if (currentWeight != null) lines.push(`Şu anki kilo: ${currentWeight} kg`);
    if (targetWeight != null) lines.push(`Hedef kilo: ${targetWeight} kg`);
    if (currentWeight != null && targetWeight != null) {
      lines.push(`Hedefe uzaklık: ${(currentWeight - targetWeight).toFixed(1)} kg`);
    }
    lines.push("");
    lines.push("Şimdi karşılama mesajını yaz. 1-2 kısa cümle, sadece düz metin.");
  }
  return lines.join("\n");
}

function sanitizeAiMessage(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('"') && text.endsWith('"') && text.length > 1) {
    text = text.slice(1, -1).trim();
  }
  text = text.replace(/\s+/g, " ");
  if (text.length > 280) text = text.slice(0, 277).trimEnd() + "…";
  return text;
}

export async function getDailyGreeting(): Promise<DailyGreeting> {
  const user = await getAuthUser();
  const locale = getUserLocale(user as { locale?: string | null });
  const today = getTurkeyTodayStr();

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
    return { message: cached.message, cached: true };
  }

  const fullName = (user as { name?: string | null }).name ?? "";
  const firstName = fullName.split(" ")[0] || (locale === "en" ? "there" : "dostum");
  const tod = timeOfDay(getTurkeyHour());
  const hello = greetingPhrase(tod, locale);

  let message: string;

  try {
    await checkRateLimit(user.id, "greeting");
  } catch {
    message = fallbackMessage(firstName, tod, locale);
    await persistGreeting(user.id, today, locale, message);
    return { message, cached: false };
  }

  const [profileRow] = await db
    .select({
      weight: users.weight,
      targetWeight: users.targetWeight,
    })
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

  const { workouts, mealsCompleted } = await fetchWeekCounts(user.id, today);

  const userContext = buildContextMessage({
    firstName,
    greetingPhrase: hello,
    locale,
    weekWorkouts: workouts,
    weekMeals: mealsCompleted,
    streak,
    currentWeight,
    targetWeight,
  });

  const startTime = Date.now();
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  try {
    const client = getAIClient();
    const response = await client.messages.create({
      model: AI_MODELS.fast,
      max_tokens: 120,
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
    const clean = sanitizeAiMessage(raw);
    message = clean || fallbackMessage(firstName, tod, locale);

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
    message = fallbackMessage(firstName, tod, locale);
  }

  await persistGreeting(user.id, today, locale, message);
  return { message, cached: false };
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
