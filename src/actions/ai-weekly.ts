"use server";

import { db } from "@/db";
import { weeklyPlans, dailyPlans, meals, exercises } from "@/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { getAIClient, AI_MODELS, checkRateLimit } from "@/lib/ai";
import { buildUserContext } from "@/lib/ai-context";
import { WEEKLY_PLAN_PROMPT } from "@/lib/ai-prompts";

interface AIMealItem {
  mealTime: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

interface AIExerciseItem {
  section: string;
  sectionLabel: string;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

export interface AIWeeklyDay {
  dayOfWeek: number;
  dayName: string;
  planType: string;
  workoutTitle: string | null;
  meals: AIMealItem[];
  exercises: AIExerciseItem[];
}

export interface AIWeeklyPlan {
  weekTitle: string;
  phase: string;
  notes: string | null;
  days: AIWeeklyDay[];
}

function parseJSON(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

function validateWeeklyPlan(data: unknown): AIWeeklyPlan {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.days)) {
    throw new Error("Invalid response format: expected { weekTitle, days: [...] }");
  }

  return {
    weekTitle: String(obj.weekTitle ?? "Haftalık Plan"),
    phase: String(obj.phase ?? "custom"),
    notes: obj.notes != null ? String(obj.notes) : null,
    days: (obj.days as Record<string, unknown>[]).map((day) => ({
      dayOfWeek: Number(day.dayOfWeek ?? 0),
      dayName: String(day.dayName ?? ""),
      planType: String(day.planType ?? "workout"),
      workoutTitle: day.workoutTitle != null ? String(day.workoutTitle) : null,
      meals: Array.isArray(day.meals)
        ? (day.meals as Record<string, unknown>[]).map((m) => ({
            mealTime: String(m.mealTime ?? "08:00"),
            mealLabel: String(m.mealLabel ?? "Öğün"),
            content: String(m.content ?? ""),
            calories: m.calories != null ? Number(m.calories) : null,
            proteinG: m.proteinG != null ? String(m.proteinG) : null,
            carbsG: m.carbsG != null ? String(m.carbsG) : null,
            fatG: m.fatG != null ? String(m.fatG) : null,
          }))
        : [],
      exercises: Array.isArray(day.exercises)
        ? (day.exercises as Record<string, unknown>[]).map((ex) => ({
            section: String(ex.section ?? "main"),
            sectionLabel: String(ex.sectionLabel ?? "Ana Antrenman"),
            name: String(ex.name ?? ""),
            sets: ex.sets != null ? Number(ex.sets) : null,
            reps: ex.reps != null ? String(ex.reps) : null,
            restSeconds: ex.restSeconds != null ? Number(ex.restSeconds) : null,
            durationMinutes:
              ex.durationMinutes != null ? Number(ex.durationMinutes) : null,
            notes: ex.notes != null ? String(ex.notes) : null,
          }))
        : [],
    })),
  };
}

function getMondayStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function buildPreviousWeeksContext(userId: string): Promise<string> {
  // Get last 4 weeks of program history
  const prevWeeks = await db
    .select({
      id: weeklyPlans.id,
      weekNumber: weeklyPlans.weekNumber,
      title: weeklyPlans.title,
      phase: weeklyPlans.phase,
      startDate: weeklyPlans.startDate,
    })
    .from(weeklyPlans)
    .where(eq(weeklyPlans.userId, userId))
    .orderBy(desc(weeklyPlans.weekNumber))
    .limit(4);

  if (prevWeeks.length === 0) return "";

  const lines: string[] = [
    "═══ ANTRENMAN GEÇMİŞİ (Önceki Haftalar — progresif yüklenme için referans) ═══",
  ];

  for (const week of prevWeeks.reverse()) {
    lines.push("");
    lines.push(
      `── Hafta ${week.weekNumber}: ${week.title} (${week.phase} fazı, ${week.startDate ?? ""}) ──`,
    );

    const days = await db
      .select({
        id: dailyPlans.id,
        dayName: dailyPlans.dayName,
        workoutTitle: dailyPlans.workoutTitle,
        planType: dailyPlans.planType,
        dayOfWeek: dailyPlans.dayOfWeek,
      })
      .from(dailyPlans)
      .where(eq(dailyPlans.weeklyPlanId, week.id))
      .orderBy(asc(dailyPlans.dayOfWeek));

    for (const day of days) {
      if (day.planType === "rest") {
        lines.push(`${day.dayName}: Dinlenme`);
        continue;
      }

      const dayExs = await db
        .select({
          name: exercises.name,
          sectionLabel: exercises.sectionLabel,
          sets: exercises.sets,
          reps: exercises.reps,
          restSeconds: exercises.restSeconds,
          durationMinutes: exercises.durationMinutes,
          notes: exercises.notes,
        })
        .from(exercises)
        .where(eq(exercises.dailyPlanId, day.id))
        .orderBy(asc(exercises.sortOrder));

      if (dayExs.length === 0) {
        lines.push(`${day.dayName} (${day.workoutTitle ?? ""}): Program yok`);
        continue;
      }

      const sections: Record<string, string[]> = {};
      for (const ex of dayExs) {
        if (!sections[ex.sectionLabel]) sections[ex.sectionLabel] = [];
        const detail =
          ex.sets && ex.reps
            ? `${ex.name} ${ex.sets}x${ex.reps}${ex.restSeconds ? ` (${ex.restSeconds}sn)` : ""}`
            : ex.durationMinutes
              ? `${ex.name} ${ex.durationMinutes}dk`
              : ex.name;
        sections[ex.sectionLabel].push(detail);
      }

      const sectionSummary = Object.entries(sections)
        .map(([label, exs]) => `${label}: ${exs.join(", ")}`)
        .join(" | ");

      lines.push(
        `${day.dayName} (${day.workoutTitle ?? ""}): ${sectionSummary}`,
      );
    }
  }

  return lines.join("\n");
}

export async function generateWeeklyPlan(dateStr: string) {
  const user = await getAuthUser();
  checkRateLimit(user.id, "weekly");

  const [userContext, prevWeeksContext] = await Promise.all([
    buildUserContext(user.id),
    buildPreviousWeeksContext(user.id),
  ]);

  const monday = getMondayStr(dateStr);

  const fullContext = [userContext, prevWeeksContext]
    .filter(Boolean)
    .join("\n\n");

  const client = getAIClient();
  const message = await client.messages.create({
    model: AI_MODELS.smart,
    max_tokens: 5000,
    system: [
      {
        type: "text",
        text: WEEKLY_PLAN_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `${fullContext}\n\nHafta başlangıç tarihi: ${monday}\n\nÖnceki haftaların programlarını analiz et ve progresif yüklenme uygulayarak bu hafta için daha ilerici bir antrenman ve beslenme programı oluştur. Hacim artır, yeni hareketler ekle, zorluk seviyesini yükselt.`,
      },
    ],
  });

  let text = message.content[0].type === "text" ? message.content[0].text : "";

  let suggestedPlan: AIWeeklyPlan;
  try {
    suggestedPlan = validateWeeklyPlan(parseJSON(text));
  } catch {
    const retry = await client.messages.create({
      model: AI_MODELS.smart,
      max_tokens: 5000,
      system: [
        {
          type: "text",
          text: WEEKLY_PLAN_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `${fullContext}\n\nHafta başlangıç tarihi: ${monday}\n\nÖnceki haftaların programlarını analiz et ve progresif yüklenme uygulayarak bu hafta için program oluştur.\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver.`,
        },
      ],
    });
    text = retry.content[0].type === "text" ? retry.content[0].text : "";
    suggestedPlan = validateWeeklyPlan(parseJSON(text));
  }

  return { suggestedPlan };
}

export async function applyWeeklyPlan(
  dateStr: string,
  plan: AIWeeklyPlan,
) {
  const user = await getAuthUser();
  const monday = getMondayStr(dateStr);

  // Check if weeklyPlan exists for this week
  const existingWeek = await db
    .select({ id: weeklyPlans.id })
    .from(weeklyPlans)
    .where(
      and(eq(weeklyPlans.startDate, monday), eq(weeklyPlans.userId, user.id)),
    );

  let weeklyPlanId: number;

  if (existingWeek.length > 0) {
    weeklyPlanId = existingWeek[0].id;

    // Update weekly plan
    await db
      .update(weeklyPlans)
      .set({
        title: plan.weekTitle,
        phase: plan.phase,
        notes: plan.notes,
      })
      .where(eq(weeklyPlans.id, weeklyPlanId));

    // Delete existing daily plans' meals and exercises
    const existingDays = await db
      .select({ id: dailyPlans.id })
      .from(dailyPlans)
      .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId));

    for (const day of existingDays) {
      await db.delete(meals).where(eq(meals.dailyPlanId, day.id));
      await db.delete(exercises).where(eq(exercises.dailyPlanId, day.id));
    }

    // Delete existing daily plans
    await db.delete(dailyPlans).where(eq(dailyPlans.weeklyPlanId, weeklyPlanId));
  } else {
    // Create new weekly plan
    const [maxRow] = await db
      .select({
        max: sql<number>`coalesce(max(${weeklyPlans.weekNumber}), 0)`,
      })
      .from(weeklyPlans)
      .where(eq(weeklyPlans.userId, user.id));

    const nextWeekNumber = (maxRow?.max ?? 0) + 1;

    const [newWeek] = await db
      .insert(weeklyPlans)
      .values({
        userId: user.id,
        weekNumber: nextWeekNumber,
        title: plan.weekTitle,
        phase: plan.phase,
        notes: plan.notes,
        startDate: monday,
      })
      .returning({ id: weeklyPlans.id });

    weeklyPlanId = newWeek.id;
  }

  // Create daily plans with meals and exercises
  for (const day of plan.days) {
    const dayDate = addDays(monday, day.dayOfWeek);

    const [newDay] = await db
      .insert(dailyPlans)
      .values({
        weeklyPlanId,
        dayOfWeek: day.dayOfWeek,
        dayName: day.dayName,
        planType: day.planType,
        workoutTitle: day.workoutTitle,
        date: dayDate,
      })
      .returning({ id: dailyPlans.id });

    // Insert meals
    if (day.meals.length > 0) {
      await db.insert(meals).values(
        day.meals.map((m, i) => ({
          dailyPlanId: newDay.id,
          mealTime: m.mealTime,
          mealLabel: m.mealLabel,
          content: m.content,
          calories: m.calories,
          proteinG: m.proteinG,
          carbsG: m.carbsG,
          fatG: m.fatG,
          isCompleted: false,
          sortOrder: i,
        })),
      );
    }

    // Insert exercises
    if (day.exercises.length > 0) {
      await db.insert(exercises).values(
        day.exercises.map((ex, i) => ({
          dailyPlanId: newDay.id,
          section: ex.section,
          sectionLabel: ex.sectionLabel,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          durationMinutes: ex.durationMinutes,
          notes: ex.notes,
          isCompleted: false,
          sortOrder: i,
        })),
      );
    }
  }

  revalidatePath("/");
}
