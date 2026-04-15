import { db } from "@/db";
import {
  dailyPlans,
  exercises,
  meals,
  weeklyPlans,
  progressLogs,
  users,
} from "@/db/schema";
import { eq, asc, desc, and, ne, isNotNull } from "drizzle-orm";

/**
 * Builds comprehensive AI context for daily meal generation.
 * Includes: user profile, body composition trend, today's workout,
 * current week's meals, and previous same-weekday meal patterns.
 */
export async function buildMealContext(dailyPlanId: number, userId: string) {
  const [currentDay] = await db
    .select({
      id: dailyPlans.id,
      dayName: dailyPlans.dayName,
      dayOfWeek: dailyPlans.dayOfWeek,
      date: dailyPlans.date,
      planType: dailyPlans.planType,
      workoutTitle: dailyPlans.workoutTitle,
      weeklyPlanId: dailyPlans.weeklyPlanId,
    })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));

  if (!currentDay) {
    return { context: "" };
  }

  const lines: string[] = [];

  // ─── 1. User profile & body composition ─────────────────────────────

  const [user] = await db
    .select({
      name: users.name,
      height: users.height,
      weight: users.weight,
      targetWeight: users.targetWeight,
      healthNotes: users.healthNotes,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (user) {
    lines.push("═══ KULLANICI PROFİLİ ═══");
    const profile: string[] = [];
    if (user.height) profile.push(`Boy: ${user.height}cm`);
    if (user.weight) profile.push(`Başlangıç kilo: ${user.weight}kg`);
    if (user.targetWeight) profile.push(`Hedef kilo: ${user.targetWeight}kg`);
    if (profile.length > 0) lines.push(profile.join(" | "));

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

    // Calculate BMR estimate if height and weight available
    if (user.height && user.weight) {
      const weightNum = parseFloat(String(user.weight));
      const heightNum = user.height;
      // Mifflin-St Jeor (male estimate, AI can adjust)
      const bmr = Math.round(10 * weightNum + 6.25 * heightNum - 5 * 30 + 5);
      lines.push(
        `Tahmini BMR: ~${bmr} kcal (Mifflin-St Jeor, yaklaşık)`,
      );
    }
  }

  // ─── 2. Progress / body composition trend (last 5 logs) ────────────

  const recentLogs = await db
    .select({
      logDate: progressLogs.logDate,
      weight: progressLogs.weight,
      fatPercent: progressLogs.fatPercent,
      fatKg: progressLogs.fatKg,
      fluidPercent: progressLogs.fluidPercent,
      bmi: progressLogs.bmi,
      torsoFatPercent: progressLogs.torsoFatPercent,
      torsoMuscleKg: progressLogs.torsoMuscleKg,
      leftArmMuscleKg: progressLogs.leftArmMuscleKg,
      rightArmMuscleKg: progressLogs.rightArmMuscleKg,
      leftLegMuscleKg: progressLogs.leftLegMuscleKg,
      rightLegMuscleKg: progressLogs.rightLegMuscleKg,
      waistCm: progressLogs.waistCm,
      notes: progressLogs.notes,
    })
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate))
    .limit(5);

  if (recentLogs.length > 0) {
    lines.push("");
    lines.push("═══ VÜCUT KOMPOZİSYONU İLERLEME (Son Ölçümler) ═══");

    for (const log of recentLogs.reverse()) {
      const parts: string[] = [`${log.logDate}:`];
      if (log.weight) parts.push(`${log.weight}kg`);
      if (log.fatPercent) parts.push(`%${log.fatPercent} yağ`);
      if (log.fatKg) parts.push(`${log.fatKg}kg yağ`);
      if (log.bmi) parts.push(`BMI ${log.bmi}`);
      if (log.fluidPercent) parts.push(`%${log.fluidPercent} sıvı`);
      if (log.waistCm) parts.push(`bel: ${log.waistCm}cm`);
      lines.push(parts.join(" | "));
    }

    // Add muscle distribution from latest log
    const latest = recentLogs[0]; // most recent (desc order, index 0)
    const muscleParts: string[] = [];
    if (latest.torsoMuscleKg)
      muscleParts.push(`Gövde: ${latest.torsoMuscleKg}kg`);
    if (latest.leftArmMuscleKg)
      muscleParts.push(`Sol kol: ${latest.leftArmMuscleKg}kg`);
    if (latest.rightArmMuscleKg)
      muscleParts.push(`Sağ kol: ${latest.rightArmMuscleKg}kg`);
    if (latest.leftLegMuscleKg)
      muscleParts.push(`Sol bacak: ${latest.leftLegMuscleKg}kg`);
    if (latest.rightLegMuscleKg)
      muscleParts.push(`Sağ bacak: ${latest.rightLegMuscleKg}kg`);
    if (muscleParts.length > 0) {
      lines.push(`Kas dağılımı (son): ${muscleParts.join(" | ")}`);
    }

    if (latest.torsoFatPercent) {
      lines.push(`Gövde yağ oranı: %${latest.torsoFatPercent}`);
    }

    // Weight trend
    if (recentLogs.length >= 2) {
      const oldest = recentLogs[recentLogs.length - 1]; // chronologically first
      if (oldest.weight && latest.weight) {
        const diff =
          parseFloat(String(latest.weight)) -
          parseFloat(String(oldest.weight));
        const direction =
          diff > 0 ? "artış" : diff < 0 ? "düşüş" : "sabit";
        lines.push(
          `Kilo trendi: ${Math.abs(diff).toFixed(1)}kg ${direction} (${oldest.logDate} → ${latest.logDate})`,
        );
      }
    }
  }

  // ─── 3. Today's workout program ────────────────────────────────────

  lines.push("");
  lines.push("═══ BUGÜNÜN ANTRENMAN PROGRAMI ═══");
  lines.push(
    `Gün: ${currentDay.dayName} (${currentDay.date ?? ""}) — ${currentDay.planType === "rest" ? "DİNLENME GÜNÜ" : currentDay.planType === "swimming" ? "YÜZME GÜNÜ" : "ANTRENMAN GÜNÜ"}`,
  );
  if (currentDay.workoutTitle) {
    lines.push(`Antrenman: ${currentDay.workoutTitle}`);
  }

  const todayExercises = await db
    .select({
      name: exercises.name,
      section: exercises.section,
      sectionLabel: exercises.sectionLabel,
      sets: exercises.sets,
      reps: exercises.reps,
      durationMinutes: exercises.durationMinutes,
    })
    .from(exercises)
    .where(eq(exercises.dailyPlanId, currentDay.id))
    .orderBy(asc(exercises.sortOrder));

  if (todayExercises.length > 0) {
    // Group by section
    const sections: Record<string, string[]> = {};
    for (const ex of todayExercises) {
      if (!sections[ex.sectionLabel]) sections[ex.sectionLabel] = [];
      const detail =
        ex.sets && ex.reps
          ? `${ex.name} ${ex.sets}x${ex.reps}`
          : ex.durationMinutes
            ? `${ex.name} ${ex.durationMinutes}dk`
            : ex.name;
      sections[ex.sectionLabel].push(detail);
    }
    for (const [label, exs] of Object.entries(sections)) {
      lines.push(`  ${label}: ${exs.join(", ")}`);
    }

    // Estimate workout intensity
    const mainExercises = todayExercises.filter(
      (e) => e.section === "main",
    );
    const totalSets = mainExercises.reduce(
      (sum, e) => sum + (e.sets ?? 0),
      0,
    );
    lines.push(
      `  Tahmini yoğunluk: ${totalSets} ana set (${totalSets >= 20 ? "yüksek" : totalSets >= 12 ? "orta" : "düşük"} hacim)`,
    );
  } else if (currentDay.planType !== "rest") {
    lines.push("  Henüz antrenman programı atanmamış");
  }

  // ─── 4. This week's other days' meal programs ─────────────────────

  if (currentDay.weeklyPlanId) {
    const [week] = await db
      .select({
        weekNumber: weeklyPlans.weekNumber,
        title: weeklyPlans.title,
      })
      .from(weeklyPlans)
      .where(eq(weeklyPlans.id, currentDay.weeklyPlanId));

    lines.push("");
    lines.push(
      `═══ BU HAFTA BESLENME (${week ? `Hafta ${week.weekNumber} - ${week.title}` : ""}) ═══`,
    );
    lines.push("(Çeşitlilik sağla, aynı yemekleri tekrar etme)");

    const weekDays = await db
      .select({
        id: dailyPlans.id,
        dayName: dailyPlans.dayName,
        planType: dailyPlans.planType,
      })
      .from(dailyPlans)
      .where(eq(dailyPlans.weeklyPlanId, currentDay.weeklyPlanId))
      .orderBy(asc(dailyPlans.dayOfWeek));

    for (const day of weekDays) {
      if (day.id === currentDay.id) continue;
      const dayMeals = await db
        .select({
          mealTime: meals.mealTime,
          mealLabel: meals.mealLabel,
          content: meals.content,
          calories: meals.calories,
        })
        .from(meals)
        .where(eq(meals.dailyPlanId, day.id))
        .orderBy(asc(meals.sortOrder));

      if (dayMeals.length > 0) {
        const totalCal = dayMeals.reduce(
          (sum, m) => sum + (m.calories ?? 0),
          0,
        );
        const mealSummary = dayMeals
          .map(
            (m) =>
              `${m.mealTime} ${m.mealLabel}: ${m.content}${m.calories ? ` (${m.calories})` : ""}`,
          )
          .join("; ");
        lines.push(
          `${day.dayName} [${day.planType}] (${totalCal} kcal): ${mealSummary}`,
        );
      }
    }
  }

  // ─── 5. Previous same-weekday meal patterns ───────────────────────

  if (currentDay.date) {
    const previousSameDayPlans = await db
      .select({
        id: dailyPlans.id,
        date: dailyPlans.date,
        dayName: dailyPlans.dayName,
        planType: dailyPlans.planType,
      })
      .from(dailyPlans)
      .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
      .where(
        and(
          eq(dailyPlans.dayOfWeek, currentDay.dayOfWeek),
          ne(dailyPlans.id, currentDay.id),
          isNotNull(dailyPlans.date),
        ),
      )
      .orderBy(desc(dailyPlans.date))
      .limit(2);

    if (previousSameDayPlans.length > 0) {
      lines.push("");
      lines.push(
        `═══ ÖNCEKİ ${currentDay.dayName.toUpperCase()} GÜNLERİ BESLENME ═══`,
      );
      lines.push(
        "(Öğün saatleri ve düzenini referans al, ama yemek çeşitliliği sağla)",
      );

      for (const prevDay of previousSameDayPlans) {
        const prevMeals = await db
          .select({
            mealTime: meals.mealTime,
            mealLabel: meals.mealLabel,
            content: meals.content,
            calories: meals.calories,
            proteinG: meals.proteinG,
            carbsG: meals.carbsG,
            fatG: meals.fatG,
          })
          .from(meals)
          .where(eq(meals.dailyPlanId, prevDay.id))
          .orderBy(asc(meals.sortOrder));

        if (prevMeals.length > 0) {
          const totalCal = prevMeals.reduce(
            (sum, m) => sum + (m.calories ?? 0),
            0,
          );
          const totalProt = prevMeals.reduce(
            (sum, m) => sum + parseFloat(String(m.proteinG ?? "0")),
            0,
          );
          lines.push(
            `${prevDay.date} [${prevDay.planType}] — Toplam: ${totalCal} kcal, ${Math.round(totalProt)}g protein:`,
          );
          for (const m of prevMeals) {
            lines.push(
              `  ${m.mealTime} ${m.mealLabel}: ${m.content} (${m.calories ?? "?"} kcal, P:${m.proteinG ?? "?"}g K:${m.carbsG ?? "?"}g Y:${m.fatG ?? "?"}g)`,
            );
          }
        }
      }
    }
  }

  return { context: lines.join("\n") };
}
