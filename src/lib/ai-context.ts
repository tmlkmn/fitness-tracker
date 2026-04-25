import { db } from "@/db";
import { users, weeklyPlans, dailyPlans, meals, exercises, progressLogs, waterLogs, sleepLogs } from "@/db/schema";
import { eq, desc, and, lte, asc, ne, inArray } from "drizzle-orm";
import { resolveTargets, type MacroTargets } from "@/lib/macro-targets";
import { computeMealMacros } from "@/lib/meal-macros";
import {
  loadUserProfileRow,
  renderUserProfileLines,
} from "@/lib/ai-user-profile-block";

// 5-minute TTL memory cache for user context
const contextCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function buildUserContext(userId: string): Promise<string> {
  const cached = contextCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }
  const user = await loadUserProfileRow(userId);

  if (!user) return "";

  const lines: string[] = renderUserProfileLines(user, {
    includeAgeAndService: true,
    compact: false,
  });

  // Current week — week containing today (startDate <= today). Single source
  // of truth for both phase + meal/workout listings; the previous version
  // used gte() which incorrectly returned future weeks instead of the
  // current one, so the assistant never saw the active program.
  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const today = getTurkeyTodayStr();
  const [activeWeek] = await db
    .select({
      id: weeklyPlans.id,
      weekNumber: weeklyPlans.weekNumber,
      phase: weeklyPlans.phase,
      title: weeklyPlans.title,
      startDate: weeklyPlans.startDate,
    })
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.userId, userId),
        lte(weeklyPlans.startDate, today),
      ),
    )
    .orderBy(desc(weeklyPlans.startDate))
    .limit(1);

  if (activeWeek) {
    lines.push(
      `Program: Hafta ${activeWeek.weekNumber}, ${activeWeek.phase} fazı (${activeWeek.title}, başlangıç: ${activeWeek.startDate ?? "?"})`,
    );

    // Fetch all daily plans for this week
    const weekDays = await db
      .select({
        id: dailyPlans.id,
        date: dailyPlans.date,
        dayName: dailyPlans.dayName,
        dayOfWeek: dailyPlans.dayOfWeek,
        planType: dailyPlans.planType,
        workoutTitle: dailyPlans.workoutTitle,
      })
      .from(dailyPlans)
      .where(eq(dailyPlans.weeklyPlanId, activeWeek.id))
      .orderBy(asc(dailyPlans.dayOfWeek));

    const todayDay = weekDays.find((d) => d.date === today) ?? null;
    const dayIds = weekDays.map((d) => d.id);

    // Batch: meals and exercises for all days in this week
    const [allMeals, allExercises] = await Promise.all([
      dayIds.length
        ? db
            .select({
              dailyPlanId: meals.dailyPlanId,
              mealTime: meals.mealTime,
              mealLabel: meals.mealLabel,
              content: meals.content,
              calories: meals.calories,
              proteinG: meals.proteinG,
              carbsG: meals.carbsG,
              fatG: meals.fatG,
              isCompleted: meals.isCompleted,
            })
            .from(meals)
            .where(inArray(meals.dailyPlanId, dayIds))
            .orderBy(asc(meals.sortOrder))
        : Promise.resolve([]),
      dayIds.length
        ? db
            .select({
              dailyPlanId: exercises.dailyPlanId,
              section: exercises.section,
              sectionLabel: exercises.sectionLabel,
              name: exercises.name,
              sets: exercises.sets,
              reps: exercises.reps,
              durationMinutes: exercises.durationMinutes,
              restSeconds: exercises.restSeconds,
              isCompleted: exercises.isCompleted,
            })
            .from(exercises)
            .where(inArray(exercises.dailyPlanId, dayIds))
            .orderBy(asc(exercises.sortOrder))
        : Promise.resolve([]),
    ]);

    type WeekMealRow = (typeof allMeals)[number];
    type WeekExerciseRow = (typeof allExercises)[number];

    const mealsByDay = new Map<number, WeekMealRow[]>();
    for (const m of allMeals) {
      if (m.dailyPlanId == null) continue;
      const arr = mealsByDay.get(m.dailyPlanId) ?? [];
      arr.push(m);
      mealsByDay.set(m.dailyPlanId, arr);
    }
    const exByDay = new Map<number, WeekExerciseRow[]>();
    for (const ex of allExercises) {
      if (ex.dailyPlanId == null) continue;
      const arr = exByDay.get(ex.dailyPlanId) ?? [];
      arr.push(ex);
      exByDay.set(ex.dailyPlanId, arr);
    }

    // ─── Today's plan — call it out prominently so chat answers
    // questions like "what should I eat today?" / "what's my workout?"
    // can rely on a clearly labeled BUGÜN block.
    if (todayDay) {
      lines.push("");
      lines.push(
        `═══ BUGÜN (${todayDay.date} - ${todayDay.dayName}, ${todayDay.planType}${todayDay.workoutTitle ? ` - ${todayDay.workoutTitle}` : ""}) ═══`,
      );

      const todayMeals = mealsByDay.get(todayDay.id) ?? [];
      if (todayMeals.length > 0) {
        lines.push("Bugünün öğünleri:");
        for (const m of todayMeals) {
          const status = m.isCompleted ? " ✓" : "";
          const macros: string[] = [];
          if (m.calories) macros.push(`${m.calories}kcal`);
          if (m.proteinG) macros.push(`P:${m.proteinG}g`);
          if (m.carbsG) macros.push(`K:${m.carbsG}g`);
          if (m.fatG) macros.push(`Y:${m.fatG}g`);
          const macroStr = macros.length ? ` [${macros.join(", ")}]` : "";
          lines.push(`  - ${m.mealTime} ${m.mealLabel}${status}: ${m.content}${macroStr}`);
        }
      }

      const todayExercises = exByDay.get(todayDay.id) ?? [];
      if (todayExercises.length > 0) {
        lines.push("Bugünün antrenmanı:");
        const bySection: Record<string, string[]> = {};
        for (const ex of todayExercises) {
          if (!bySection[ex.sectionLabel]) bySection[ex.sectionLabel] = [];
          const status = ex.isCompleted ? " ✓" : "";
          const detail =
            ex.sets && ex.reps
              ? `${ex.name} ${ex.sets}x${ex.reps}${ex.restSeconds ? ` (${ex.restSeconds}sn dinlenme)` : ""}`
              : ex.durationMinutes
                ? `${ex.name} ${ex.durationMinutes}dk`
                : ex.name;
          bySection[ex.sectionLabel].push(`${detail}${status}`);
        }
        for (const [label, items] of Object.entries(bySection)) {
          lines.push(`  ${label}:`);
          for (const item of items) lines.push(`    - ${item}`);
        }
      }

      if (todayMeals.length === 0 && todayExercises.length === 0) {
        lines.push("Not: Bugün için planlanmış öğün veya egzersiz yok.");
      }
    }

    // ─── Full week meal plan
    const mealLines: string[] = [];
    for (const day of weekDays) {
      const dayMeals = mealsByDay.get(day.id) ?? [];
      if (dayMeals.length === 0) continue;
      const summary = dayMeals
        .map((m) => `${m.mealLabel}: ${m.content}${m.calories ? ` (${m.calories} kcal)` : ""}`)
        .join(" | ");
      mealLines.push(`${day.dayName} (${day.planType}): ${summary}`);
    }
    if (mealLines.length > 0) {
      lines.push("");
      lines.push("═══ HAFTALIK BESLENME PLANI ═══");
      lines.push(...mealLines);
    }

    // ─── Full week workout plan
    const workoutLines: string[] = [];
    for (const day of weekDays) {
      if (day.planType === "rest") {
        workoutLines.push(`${day.dayName}: Dinlenme`);
        continue;
      }
      const dayExs = exByDay.get(day.id) ?? [];
      if (dayExs.length === 0) {
        workoutLines.push(`${day.dayName} (${day.workoutTitle ?? day.planType}): Program tanımlı değil`);
        continue;
      }
      const sections: Record<string, string[]> = {};
      for (const ex of dayExs) {
        if (!sections[ex.sectionLabel]) sections[ex.sectionLabel] = [];
        const detail =
          ex.sets && ex.reps
            ? `${ex.name} ${ex.sets}x${ex.reps}`
            : ex.durationMinutes
              ? `${ex.name} ${ex.durationMinutes}dk`
              : ex.name;
        sections[ex.sectionLabel].push(detail);
      }
      const summary = Object.entries(sections)
        .map(([label, exs]) => `${label}: ${exs.join(", ")}`)
        .join(" | ");
      workoutLines.push(`${day.dayName} (${day.workoutTitle ?? day.planType}): ${summary}`);
    }
    if (workoutLines.length > 0) {
      lines.push("");
      lines.push("═══ HAFTALIK ANTRENMAN PROGRAMI ═══");
      lines.push(...workoutLines);
    }
  }

  // Latest progress (last 2 for trend comparison)
  const recentLogs = await db
    .select({
      weight: progressLogs.weight,
      fatPercent: progressLogs.fatPercent,
      bmi: progressLogs.bmi,
      waistCm: progressLogs.waistCm,
      fatKg: progressLogs.fatKg,
      logDate: progressLogs.logDate,
    })
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate))
    .limit(2);

  if (recentLogs.length > 0) {
    const latest = recentLogs[0];
    const logParts: string[] = [];
    if (latest.weight) logParts.push(`${latest.weight}kg`);
    if (latest.fatPercent) logParts.push(`%${latest.fatPercent} yağ`);
    if (latest.bmi) logParts.push(`BMI ${latest.bmi}`);
    if (latest.waistCm) logParts.push(`Bel ${latest.waistCm}cm`);
    if (logParts.length > 0) {
      lines.push(`Son ölçüm (${latest.logDate}): ${logParts.join(", ")}`);
    }

    // Trend comparison between last 2 measurements
    if (recentLogs.length === 2) {
      const prev = recentLogs[1];
      const trendParts: string[] = [];

      if (latest.weight && prev.weight) {
        const diff = parseFloat(String(latest.weight)) - parseFloat(String(prev.weight));
        trendParts.push(`Kilo: ${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg`);
      }
      if (latest.fatPercent && prev.fatPercent) {
        const diff = parseFloat(String(latest.fatPercent)) - parseFloat(String(prev.fatPercent));
        trendParts.push(`Yağ: ${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`);
      }
      if (latest.waistCm && prev.waistCm) {
        const diff = parseFloat(String(latest.waistCm)) - parseFloat(String(prev.waistCm));
        trendParts.push(`Bel: ${diff > 0 ? "+" : ""}${diff.toFixed(1)}cm`);
      }

      if (trendParts.length > 0) {
        lines.push(`Trend (${prev.logDate} → ${latest.logDate}): ${trendParts.join(", ")}`);
      }
    }
  }

  // Water intake (last 7 days)
  const recentWater = await db
    .select({
      glasses: waterLogs.glasses,
      targetGlasses: waterLogs.targetGlasses,
    })
    .from(waterLogs)
    .where(eq(waterLogs.userId, userId))
    .orderBy(desc(waterLogs.logDate))
    .limit(7);

  if (recentWater.length > 0) {
    const avgGlasses = (recentWater.reduce((s, w) => s + w.glasses, 0) / recentWater.length).toFixed(1);
    const avgTarget = Math.round(recentWater.reduce((s, w) => s + w.targetGlasses, 0) / recentWater.length);
    const avgLiters = (parseFloat(avgGlasses) * 0.25).toFixed(1);
    lines.push(`Su alımı (son ${recentWater.length} gün): Ort. ${avgGlasses} bardak/gün (hedef: ${avgTarget}, ${avgLiters}L/gün)`);
  }

  // Sleep (last 7 days)
  const recentSleep = await db
    .select({
      durationMinutes: sleepLogs.durationMinutes,
      quality: sleepLogs.quality,
    })
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, userId))
    .orderBy(desc(sleepLogs.logDate))
    .limit(7);

  if (recentSleep.length > 0) {
    const validDurations = recentSleep.filter((s) => s.durationMinutes != null);
    const validQualities = recentSleep.filter((s) => s.quality != null);
    const parts: string[] = [];
    if (validDurations.length > 0) {
      const avgMin = Math.round(validDurations.reduce((s, sl) => s + sl.durationMinutes!, 0) / validDurations.length);
      const h = Math.floor(avgMin / 60);
      const m = avgMin % 60;
      parts.push(`Ort. ${h}sa ${m}dk`);
    }
    if (validQualities.length > 0) {
      const avgQ = (validQualities.reduce((s, sl) => s + sl.quality!, 0) / validQualities.length).toFixed(1);
      parts.push(`kalite: ${avgQ}/5`);
    }
    if (parts.length > 0) {
      lines.push(`Uyku (son ${recentSleep.length} gün): ${parts.join(", ")}`);
    }
  }

  const result = lines.join("\n");
  contextCache.set(userId, { text: result, timestamp: Date.now() });
  return result;
}

export interface MacroBudgetContext {
  targets: MacroTargets | null;
  consumed: { calories: number; protein: number; carbs: number; fat: number };
  remaining: { calories: number; protein: number; carbs: number; fat: number } | null;
  text: string;
}

/**
 * Builds macro budget context for a specific day — targets from user profile,
 * consumed from existing meals on that day (optionally excluding a specific meal).
 * Returns a human-readable summary suitable for AI prompts.
 */
export async function getMealMacroBudget(
  userId: string,
  dailyPlanId: number,
  excludeMealId?: number | null,
): Promise<MacroBudgetContext> {
  const [userRow] = await db
    .select({
      weight: users.weight,
      height: users.height,
      age: users.age,
      fitnessLevel: users.fitnessLevel,
      serviceType: users.serviceType,
      targetCalories: users.targetCalories,
      targetProteinG: users.targetProteinG,
      targetCarbsG: users.targetCarbsG,
      targetFatG: users.targetFatG,
    })
    .from(users)
    .where(eq(users.id, userId));

  const targets = userRow ? resolveTargets(userRow) : null;

  const whereClause = excludeMealId
    ? and(eq(meals.dailyPlanId, dailyPlanId), ne(meals.id, excludeMealId))
    : eq(meals.dailyPlanId, dailyPlanId);

  const dayMeals = await db
    .select({
      calories: meals.calories,
      proteinG: meals.proteinG,
      carbsG: meals.carbsG,
      fatG: meals.fatG,
    })
    .from(meals)
    .where(whereClause);

  const totals = computeMealMacros(dayMeals);
  const consumed = {
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
  };

  const remaining = targets
    ? {
        calories: targets.calories - consumed.calories,
        protein: targets.protein - consumed.protein,
        carbs: targets.carbs - consumed.carbs,
        fat: targets.fat - consumed.fat,
      }
    : null;

  const parts: string[] = [];
  if (targets) {
    parts.push(
      `Günlük hedef: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g karb, ${targets.fat}g yağ`,
    );
  }
  parts.push(
    `Bugün tüketilen (diğer öğünler): ${consumed.calories} kcal, ${consumed.protein}g P, ${consumed.carbs}g K, ${consumed.fat}g Y`,
  );
  if (remaining) {
    parts.push(
      `Bu öğün için kalan bütçe: ${remaining.calories} kcal, ${remaining.protein}g P, ${remaining.carbs}g K, ${remaining.fat}g Y`,
    );
  }

  return {
    targets,
    consumed,
    remaining,
    text: parts.join("\n"),
  };
}
