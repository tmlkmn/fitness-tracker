"use server";

import { db } from "@/db";
import { weeklyPlans, dailyPlans, meals, exercises, progressLogs, users } from "@/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { getAIClient, AI_MODELS, checkRateLimit } from "@/lib/ai";
import { WEEKLY_PLAN_PROMPT, NUTRITION_ONLY_WEEKLY_PROMPT } from "@/lib/ai-prompts";

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
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // Fix single-quoted strings → double-quoted
  // Only when the value looks like a JSON string (not inside already-double-quoted text)
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');
  cleaned = cleaned.replace(/'([^']*)'(?=\s*[:,\]}])/g, '"$1"');

  return JSON.parse(cleaned);
}

const TURKISH_DAY_NAMES_MAP: Record<string, number> = {
  pazartesi: 0,
  salı: 1,
  "salÄ±": 1,
  çarşamba: 2,
  "Ã§arÅŸamba": 2,
  perşembe: 3,
  "perÅŸembe": 3,
  cuma: 4,
  cumartesi: 5,
  pazar: 6,
};

function resolveDayOfWeek(dayName: string, aiDayOfWeek: number, index: number): number {
  const normalized = dayName.toLowerCase().trim();
  if (normalized in TURKISH_DAY_NAMES_MAP) {
    return TURKISH_DAY_NAMES_MAP[normalized];
  }
  // Fallback: if AI sent 0-6 and it looks like Turkey format, use it; otherwise use index
  if (aiDayOfWeek >= 0 && aiDayOfWeek <= 6) return aiDayOfWeek;
  return index;
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
    days: (obj.days as Record<string, unknown>[]).map((day, index) => ({
      dayOfWeek: resolveDayOfWeek(String(day.dayName ?? ""), Number(day.dayOfWeek ?? index), index),
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

async function buildWeeklyPlanContext(userId: string): Promise<string> {
  const lines: string[] = [];

  // ─── 1. User profile ──────────────────────────────────────────────────
  const [user] = await db
    .select({
      height: users.height,
      weight: users.weight,
      targetWeight: users.targetWeight,
      healthNotes: users.healthNotes,
      dailyRoutine: users.dailyRoutine,
      fitnessLevel: users.fitnessLevel,
      sportHistory: users.sportHistory,
      currentMedications: users.currentMedications,
      serviceType: users.serviceType,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (user) {
    lines.push("═══ KULLANICI PROFİLİ ═══");
    const parts: string[] = [];
    if (user.height) parts.push(`Boy: ${user.height}cm`);
    if (user.weight) parts.push(`Başlangıç kilo: ${user.weight}kg`);
    if (user.targetWeight) parts.push(`Hedef kilo: ${user.targetWeight}kg`);
    if (parts.length > 0) lines.push(parts.join(" | "));
    if (user.healthNotes) {
      try {
        const notes = JSON.parse(user.healthNotes);
        if (Array.isArray(notes) && notes.length > 0) {
          lines.push(`Sağlık notları/kısıtlamalar: ${notes.join(". ")}`);
        }
      } catch {
        lines.push(`Sağlık notları: ${user.healthNotes}`);
      }
    }
    if (user.dailyRoutine && Array.isArray(user.dailyRoutine) && user.dailyRoutine.length > 0) {
      const routineStr = (user.dailyRoutine as { time: string; event: string }[])
        .map((r) => `${r.time} ${r.event}`)
        .join(", ");
      lines.push(`Günlük program: ${routineStr}`);
    }
    const fitnessLabels: Record<string, string> = {
      beginner: "Yeni başlayan",
      returning: "Ara vermiş, tekrar başlayan",
      intermediate: "Orta düzey",
      advanced: "İleri düzey",
    };
    if (user.fitnessLevel) {
      lines.push(`Fitness seviyesi: ${fitnessLabels[user.fitnessLevel] ?? user.fitnessLevel}`);
    }
    if (user.sportHistory) {
      lines.push(`Spor geçmişi: ${user.sportHistory}`);
    }
    if (user.currentMedications) {
      lines.push(`İlaçlar/supplementler: ${user.currentMedications}`);
    }
  }

  // ─── 2. Body composition trend ────────────────────────────────────────
  const recentLogs = await db
    .select({
      logDate: progressLogs.logDate,
      weight: progressLogs.weight,
      fatPercent: progressLogs.fatPercent,
      fatKg: progressLogs.fatKg,
      bmi: progressLogs.bmi,
      waistCm: progressLogs.waistCm,
      torsoMuscleKg: progressLogs.torsoMuscleKg,
      leftArmMuscleKg: progressLogs.leftArmMuscleKg,
      rightArmMuscleKg: progressLogs.rightArmMuscleKg,
      leftLegMuscleKg: progressLogs.leftLegMuscleKg,
      rightLegMuscleKg: progressLogs.rightLegMuscleKg,
    })
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate))
    .limit(5);

  if (recentLogs.length > 0) {
    lines.push("");
    lines.push("═══ VÜCUT KOMPOZİSYONU İLERLEME ═══");
    for (const log of recentLogs.reverse()) {
      const p: string[] = [`${log.logDate}:`];
      if (log.weight) p.push(`${log.weight}kg`);
      if (log.fatPercent) p.push(`%${log.fatPercent} yağ`);
      if (log.bmi) p.push(`BMI ${log.bmi}`);
      if (log.waistCm) p.push(`bel: ${log.waistCm}cm`);
      lines.push(p.join(" | "));
    }
    const latest = recentLogs[0];
    const muscleParts: string[] = [];
    if (latest.torsoMuscleKg) muscleParts.push(`Gövde: ${latest.torsoMuscleKg}kg`);
    if (latest.leftArmMuscleKg) muscleParts.push(`Sol kol: ${latest.leftArmMuscleKg}kg`);
    if (latest.rightArmMuscleKg) muscleParts.push(`Sağ kol: ${latest.rightArmMuscleKg}kg`);
    if (latest.leftLegMuscleKg) muscleParts.push(`Sol bacak: ${latest.leftLegMuscleKg}kg`);
    if (latest.rightLegMuscleKg) muscleParts.push(`Sağ bacak: ${latest.rightLegMuscleKg}kg`);
    if (muscleParts.length > 0) lines.push(`Kas dağılımı: ${muscleParts.join(" | ")}`);

    if (recentLogs.length >= 2) {
      const oldest = recentLogs[recentLogs.length - 1];
      if (oldest.weight && latest.weight) {
        const diff = parseFloat(String(latest.weight)) - parseFloat(String(oldest.weight));
        lines.push(`Kilo trendi: ${Math.abs(diff).toFixed(1)}kg ${diff > 0 ? "artış" : diff < 0 ? "düşüş" : "sabit"} (${oldest.logDate} → ${latest.logDate})`);
      }
    }
  }

  // ─── 3. Previous weeks' programs (skip workout details for nutrition-only) ──
  if (user?.serviceType !== "nutrition") {
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

  if (prevWeeks.length > 0) {
    lines.push("");
    lines.push("═══ ANTRENMAN GEÇMİŞİ (Önceki Haftalar — progresif yüklenme için referans) ═══");

    for (const week of prevWeeks.reverse()) {
      lines.push("");
      lines.push(`── Hafta ${week.weekNumber}: ${week.title} (${week.phase} fazı, ${week.startDate ?? ""}) ──`);

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
          const detail = ex.sets && ex.reps
            ? `${ex.name} ${ex.sets}x${ex.reps}${ex.restSeconds ? ` (${ex.restSeconds}sn)` : ""}`
            : ex.durationMinutes
              ? `${ex.name} ${ex.durationMinutes}dk`
              : ex.name;
          sections[ex.sectionLabel].push(detail);
        }

        const sectionSummary = Object.entries(sections)
          .map(([label, exs]) => `${label}: ${exs.join(", ")}`)
          .join(" | ");

        lines.push(`${day.dayName} (${day.workoutTitle ?? ""}): ${sectionSummary}`);
      }
    }
  }
  }

  return lines.join("\n");
}

export async function generateWeeklyPlan(dateStr: string, userNote?: string) {
  const user = await getAuthUser();
  checkRateLimit(user.id, "weekly");

  // Get user's service type
  const [userRow] = await db
    .select({ serviceType: users.serviceType })
    .from(users)
    .where(eq(users.id, user.id));
  const isNutritionOnly = userRow?.serviceType === "nutrition";
  const systemPrompt = isNutritionOnly ? NUTRITION_ONLY_WEEKLY_PROMPT : WEEKLY_PLAN_PROMPT;

  const monday = getMondayStr(dateStr);
  const weeklyContext = await buildWeeklyPlanContext(user.id);

  let userMessage = isNutritionOnly
    ? `${weeklyContext}\n\nHafta başlangıç tarihi: ${monday}\n\nKullanıcının vücut kompozisyonunu ve yaşam tarzını analiz ederek bu hafta için kişiye özel 7 günlük beslenme programı oluştur. Hedef kiloya göre kalori stratejisi belirle.`
    : `${weeklyContext}\n\nHafta başlangıç tarihi: ${monday}\n\nÖnceki haftaların programlarını analiz et ve progresif yüklenme uygulayarak bu hafta için daha ilerici bir antrenman ve beslenme programı oluştur. Vücut kompozisyonu trendine göre kalori stratejisi belirle. Hacim artır, yeni hareketler ekle, zorluk seviyesini yükselt.`;

  if (userNote?.trim()) {
    userMessage += `\n\n═══ KULLANICI İSTEĞİ ═══\nKullanıcı bu hafta için şunları belirtti: ${userNote.trim()}\nBu isteği mutlaka dikkate al.`;
  }

  try {
    const client = getAIClient();
    const message = await client.messages.create({
      model: AI_MODELS.smart,
      max_tokens: 16000,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    let text = message.content[0].type === "text" ? message.content[0].text : "";

    // If the response was truncated (stop_reason !== "end_turn"), retry with a nudge
    let suggestedPlan: AIWeeklyPlan;
    const wasTruncated = message.stop_reason !== "end_turn";
    if (!wasTruncated) {
      try {
        suggestedPlan = validateWeeklyPlan(parseJSON(text));
      } catch {
        // JSON was complete but invalid — retry
        const retry = await client.messages.create({
          model: AI_MODELS.smart,
          max_tokens: 16000,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: `${userMessage}\n\nÖNCEKİ YANIT HATALI JSON DÖNDÜ. Sadece geçerli JSON yanıt ver.`,
            },
          ],
        });
        text = retry.content[0].type === "text" ? retry.content[0].text : "";
        suggestedPlan = validateWeeklyPlan(parseJSON(text));
      }
    } else {
      // Response was truncated — retry asking for completion
      const retry = await client.messages.create({
        model: AI_MODELS.smart,
        max_tokens: 16000,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: `${userMessage}\n\nÖNCEKİ YANITINDA JSON KESILDI. Lütfen tüm 7 günü içeren eksiksiz JSON döndür. Daha kısa egzersiz notları ve öğün açıklamaları kullan.`,
          },
        ],
      });
      text = retry.content[0].type === "text" ? retry.content[0].text : "";
      suggestedPlan = validateWeeklyPlan(parseJSON(text));
    }

    return { suggestedPlan };
  } catch (error) {
    console.error("[AI Weekly] Error generating plan:", error);
    throw new Error("AI_UNAVAILABLE");
  }
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
