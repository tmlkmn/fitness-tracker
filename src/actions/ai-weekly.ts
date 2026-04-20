"use server";

import { db } from "@/db";
import { weeklyPlans, dailyPlans, meals, exercises, progressLogs, users, waterLogs, sleepLogs } from "@/db/schema";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth-utils";
import { normalizeEvent } from "@/lib/routine-constants";
import {
  type AIWeeklyPlan,
  type AIWeeklyDay,
} from "@/lib/ai-weekly-types";

export type { AIWeeklyPlan, AIWeeklyDay } from "@/lib/ai-weekly-types";

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

export async function buildWeeklyPlanContext(userId: string): Promise<string> {
  const lines: string[] = [];

  // ─── 1. User profile ──────────────────────────────────────────────────
  const [user] = await db
    .select({
      height: users.height,
      weight: users.weight,
      targetWeight: users.targetWeight,
      healthNotes: users.healthNotes,
      dailyRoutine: users.dailyRoutine,
      weekendRoutine: users.weekendRoutine,
      fitnessLevel: users.fitnessLevel,
      sportHistory: users.sportHistory,
      currentMedications: users.currentMedications,
      serviceType: users.serviceType,
      supplementSchedule: users.supplementSchedule,
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
        .map((r) => `${r.time} ${normalizeEvent(r.event)}`)
        .join(", ");
      const hasWeekend = user.weekendRoutine && Array.isArray(user.weekendRoutine) && user.weekendRoutine.length > 0;
      lines.push(`${hasWeekend ? "Hafta içi programı" : "Günlük program"}: ${routineStr}`);
    }
    if (user.weekendRoutine && Array.isArray(user.weekendRoutine) && user.weekendRoutine.length > 0) {
      const routineStr = (user.weekendRoutine as { time: string; event: string }[])
        .map((r) => `${r.time} ${normalizeEvent(r.event)}`)
        .join(", ");
      lines.push(`Hafta sonu programı: ${routineStr}`);
    }
    // Supplement schedule
    if (user.supplementSchedule && Array.isArray(user.supplementSchedule) && user.supplementSchedule.length > 0) {
      const suppStr = (user.supplementSchedule as { period: string; supplements: string }[])
        .map((s) => `${s.period}: ${s.supplements}`)
        .join("; ");
      lines.push(`Supplement takvimi: ${suppStr}`);
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

  // ─── 2b. Water & Sleep (last 7 days) ─────────────────────────────────
  const recentWater = await db
    .select({ glasses: waterLogs.glasses, targetGlasses: waterLogs.targetGlasses })
    .from(waterLogs)
    .where(eq(waterLogs.userId, userId))
    .orderBy(desc(waterLogs.logDate))
    .limit(7);

  if (recentWater.length > 0) {
    const avgGlasses = (recentWater.reduce((s, w) => s + w.glasses, 0) / recentWater.length).toFixed(1);
    const avgTarget = Math.round(recentWater.reduce((s, w) => s + w.targetGlasses, 0) / recentWater.length);
    lines.push(`Su alımı (son ${recentWater.length} gün): Ort. ${avgGlasses}/${avgTarget} bardak/gün`);
  }

  const recentSleep = await db
    .select({ durationMinutes: sleepLogs.durationMinutes, quality: sleepLogs.quality })
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, userId))
    .orderBy(desc(sleepLogs.logDate))
    .limit(7);

  if (recentSleep.length > 0) {
    const validD = recentSleep.filter((s) => s.durationMinutes != null);
    const validQ = recentSleep.filter((s) => s.quality != null);
    const parts: string[] = [];
    if (validD.length > 0) {
      const avgMin = Math.round(validD.reduce((s, sl) => s + sl.durationMinutes!, 0) / validD.length);
      parts.push(`Ort. ${Math.floor(avgMin / 60)}sa ${avgMin % 60}dk`);
    }
    if (validQ.length > 0) {
      parts.push(`kalite: ${(validQ.reduce((s, sl) => s + sl.quality!, 0) / validQ.length).toFixed(1)}/5`);
    }
    if (parts.length > 0) lines.push(`Uyku (son ${recentSleep.length} gün): ${parts.join(", ")}`);
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
    .limit(2);

  if (prevWeeks.length > 0) {
    lines.push("");
    lines.push("═══ ANTRENMAN GEÇMİŞİ (Önceki Haftalar — progresif yüklenme için referans) ═══");

    const weekIds = prevWeeks.map(w => w.id);

    // Fetch all days for these weeks in one query
    const allDays = await db
      .select({
        id: dailyPlans.id,
        weeklyPlanId: dailyPlans.weeklyPlanId,
        dayName: dailyPlans.dayName,
        workoutTitle: dailyPlans.workoutTitle,
        planType: dailyPlans.planType,
        dayOfWeek: dailyPlans.dayOfWeek,
      })
      .from(dailyPlans)
      .where(inArray(dailyPlans.weeklyPlanId, weekIds))
      .orderBy(asc(dailyPlans.dayOfWeek));

    const dayIds = allDays.filter(d => d.planType !== "rest").map(d => d.id);

    // Fetch all exercises for those days in one query
    const allExercises = dayIds.length > 0
      ? await db
          .select({
            dailyPlanId: exercises.dailyPlanId,
            name: exercises.name,
            sectionLabel: exercises.sectionLabel,
            sets: exercises.sets,
            reps: exercises.reps,
            restSeconds: exercises.restSeconds,
            durationMinutes: exercises.durationMinutes,
          })
          .from(exercises)
          .where(inArray(exercises.dailyPlanId, dayIds))
          .orderBy(asc(exercises.sortOrder))
      : [];

    // Group exercises by dailyPlanId
    const exercisesByDay = new Map<number, typeof allExercises>();
    for (const ex of allExercises) {
      if (ex.dailyPlanId == null) continue;
      const arr = exercisesByDay.get(ex.dailyPlanId) ?? [];
      arr.push(ex);
      exercisesByDay.set(ex.dailyPlanId, arr);
    }

    // Group days by weeklyPlanId
    const daysByWeek = new Map<number, typeof allDays>();
    for (const day of allDays) {
      if (day.weeklyPlanId == null) continue;
      const arr = daysByWeek.get(day.weeklyPlanId) ?? [];
      arr.push(day);
      daysByWeek.set(day.weeklyPlanId, arr);
    }

    for (const week of prevWeeks.reverse()) {
      lines.push("");
      lines.push(`── Hafta ${week.weekNumber}: ${week.title} (${week.phase} fazı, ${week.startDate ?? ""}) ──`);

      const days = daysByWeek.get(week.id) ?? [];

      for (const day of days) {
        if (day.planType === "rest") {
          lines.push(`${day.dayName}: Dinlenme`);
          continue;
        }

        const dayExs = exercisesByDay.get(day.id) ?? [];

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

export async function applyWeeklyPlan(
  dateStr: string,
  plan: AIWeeklyPlan,
  applyMode?: "both" | "nutrition" | "workout",
) {
  const user = await getAuthUser();
  const monday = getMondayStr(dateStr);
  const mode = applyMode ?? "both";

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

    // Update weekly plan metadata
    await db
      .update(weeklyPlans)
      .set({
        title: plan.weekTitle,
        phase: plan.phase,
        notes: plan.notes,
      })
      .where(eq(weeklyPlans.id, weeklyPlanId));

    const existingDays = await db
      .select({ id: dailyPlans.id })
      .from(dailyPlans)
      .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId));

    if (mode === "both") {
      // Delete all existing data
      for (const day of existingDays) {
        await db.delete(meals).where(eq(meals.dailyPlanId, day.id));
        await db.delete(exercises).where(eq(exercises.dailyPlanId, day.id));
      }
      await db.delete(dailyPlans).where(eq(dailyPlans.weeklyPlanId, weeklyPlanId));
    } else if (mode === "nutrition") {
      // Only delete meals, keep exercises
      for (const day of existingDays) {
        await db.delete(meals).where(eq(meals.dailyPlanId, day.id));
      }
    } else if (mode === "workout") {
      // Only delete exercises, keep meals
      for (const day of existingDays) {
        await db.delete(exercises).where(eq(exercises.dailyPlanId, day.id));
      }
    }

    // For selective modes, update existing daily plans or create missing ones
    if (mode !== "both") {
      for (const day of plan.days) {
        const dayDate = addDays(monday, day.dayOfWeek);
        // Find existing daily plan for this day
        const [existingDay] = await db
          .select({ id: dailyPlans.id })
          .from(dailyPlans)
          .where(
            and(
              eq(dailyPlans.weeklyPlanId, weeklyPlanId),
              eq(dailyPlans.dayOfWeek, day.dayOfWeek),
            ),
          );

        let dayId: number;
        if (existingDay) {
          dayId = existingDay.id;
          // Update planType and workoutTitle if workout mode
          if (mode === "workout") {
            await db
              .update(dailyPlans)
              .set({
                planType: day.planType,
                workoutTitle: day.workoutTitle,
              })
              .where(eq(dailyPlans.id, dayId));
          }
        } else {
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
          dayId = newDay.id;
        }

        // Insert only the selected type
        if (mode === "nutrition" && day.meals.length > 0) {
          await db.insert(meals).values(
            day.meals.map((m, i) => ({
              dailyPlanId: dayId,
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
        if (mode === "workout" && day.exercises.length > 0) {
          await db.insert(exercises).values(
            day.exercises.map((ex, i) => ({
              dailyPlanId: dayId,
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
      return;
    }
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

  // Create daily plans with meals and exercises (full mode or new week)
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

    // Insert meals (skip for workout-only mode on new week)
    if (day.meals.length > 0 && mode !== "workout") {
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

    // Insert exercises (skip for nutrition-only mode on new week)
    if (day.exercises.length > 0 && mode !== "nutrition") {
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

export async function deleteWeeklyPlan(weeklyPlanId: number) {
  const user = await getAuthUser();

  const [week] = await db
    .select({ id: weeklyPlans.id })
    .from(weeklyPlans)
    .where(
      and(eq(weeklyPlans.id, weeklyPlanId), eq(weeklyPlans.userId, user.id)),
    );

  if (!week) throw new Error("Not found");

  const days = await db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId));

  for (const day of days) {
    await db.delete(meals).where(eq(meals.dailyPlanId, day.id));
    await db.delete(exercises).where(eq(exercises.dailyPlanId, day.id));
  }

  await db
    .delete(dailyPlans)
    .where(eq(dailyPlans.weeklyPlanId, weeklyPlanId));
  await db.delete(weeklyPlans).where(eq(weeklyPlans.id, weeklyPlanId));

  revalidatePath("/");
}
