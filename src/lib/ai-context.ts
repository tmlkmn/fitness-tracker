import { db } from "@/db";
import { users, weeklyPlans, dailyPlans, meals, exercises, waterLogs, sleepLogs } from "@/db/schema";
import { eq, desc, and, lte, asc, ne, inArray } from "drizzle-orm";
import { resolveTargetsForDay, type MacroTargets } from "@/lib/macro-targets";
import { computeMealMacros } from "@/lib/meal-macros";
import {
  loadUserProfileRow,
  renderUserProfileLines,
} from "@/lib/ai-user-profile-block";
import { loadRecentProgressLines } from "@/lib/ai-progress-block";
import {
  getDailySupplementBudget,
  subtractSupplementBudget,
} from "@/lib/supplement-budget";
import type { Locale } from "@/lib/locale";

// 5-minute TTL memory cache for user context (keyed by userId + locale)
const contextCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

interface CtxLabels {
  programLine: (week: number, phase: string, title: string, start: string) => string;
  todayHeader: (date: string, day: string, planType: string, workoutTitle?: string | null) => string;
  todayMeals: string;
  todayWorkout: string;
  noPlanToday: string;
  weeklyNutrition: string;
  weeklyWorkout: string;
  rest: string;
  planUndefined: string;
  waterLine: (days: number, avg: string, target: number, liters: string) => string;
  sleepLine: (days: number, parts: string) => string;
  sleepAvg: (h: number, m: number) => string;
  sleepQuality: (q: string) => string;
  rsec: (s: number) => string;
  dmin: (m: number) => string;
}

function labelsFor(locale: Locale): CtxLabels {
  if (locale === "en") {
    return {
      programLine: (week, phase, title, start) =>
        `Program: Week ${week}, ${phase} phase (${title}, start: ${start})`,
      todayHeader: (date, day, planType, workoutTitle) =>
        `═══ TODAY (${date} - ${day}, ${planType}${workoutTitle ? ` - ${workoutTitle}` : ""}) ═══`,
      todayMeals: "Today's meals:",
      todayWorkout: "Today's workout:",
      noPlanToday: "Note: No meals or exercises planned for today.",
      weeklyNutrition: "═══ WEEKLY NUTRITION PLAN ═══",
      weeklyWorkout: "═══ WEEKLY WORKOUT PROGRAM ═══",
      rest: "Rest",
      planUndefined: "No program defined",
      waterLine: (days, avg, target, liters) =>
        `Water intake (last ${days} days): Avg ${avg} glasses/day (target: ${target}, ${liters}L/day)`,
      sleepLine: (days, parts) => `Sleep (last ${days} days): ${parts}`,
      sleepAvg: (h, m) => `Avg ${h}h ${m}min`,
      sleepQuality: (q) => `quality: ${q}/5`,
      rsec: (s) => `${s}s rest`,
      dmin: (m) => `${m}min`,
    };
  }
  return {
    programLine: (week, phase, title, start) =>
      `Program: Hafta ${week}, ${phase} fazı (${title}, başlangıç: ${start})`,
    todayHeader: (date, day, planType, workoutTitle) =>
      `═══ BUGÜN (${date} - ${day}, ${planType}${workoutTitle ? ` - ${workoutTitle}` : ""}) ═══`,
    todayMeals: "Bugünün öğünleri:",
    todayWorkout: "Bugünün antrenmanı:",
    noPlanToday: "Not: Bugün için planlanmış öğün veya egzersiz yok.",
    weeklyNutrition: "═══ HAFTALIK BESLENME PLANI ═══",
    weeklyWorkout: "═══ HAFTALIK ANTRENMAN PROGRAMI ═══",
    rest: "Dinlenme",
    planUndefined: "Program tanımlı değil",
    waterLine: (days, avg, target, liters) =>
      `Su alımı (son ${days} gün): Ort. ${avg} bardak/gün (hedef: ${target}, ${liters}L/gün)`,
    sleepLine: (days, parts) => `Uyku (son ${days} gün): ${parts}`,
    sleepAvg: (h, m) => `Ort. ${h}sa ${m}dk`,
    sleepQuality: (q) => `kalite: ${q}/5`,
    rsec: (s) => `${s}sn dinlenme`,
    dmin: (m) => `${m}dk`,
  };
}

export async function buildUserContext(
  userId: string,
  options?: { forceRefresh?: boolean; locale?: Locale; slim?: boolean },
): Promise<string> {
  const locale: Locale = options?.locale ?? "tr";
  const slim = options?.slim === true;
  const cacheKey = `${userId}:${locale}:${slim ? "slim" : "full"}`;
  const cached = contextCache.get(cacheKey);
  if (!options?.forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }
  const L = labelsFor(locale);
  const user = await loadUserProfileRow(userId);

  if (!user) return "";

  const lines: string[] = renderUserProfileLines(user, {
    includeAgeAndService: true,
    compact: slim,
  });

  // Slim mode skips weekly plan rendering, water/sleep telemetry, supplement
  // breakdown, and progress lines — meant for single-meal variation and
  // exercise tips where the heavy program state isn't actionable. Caller
  // gets profile + age/service + (in slim) one-line goal context, which is
  // enough for the model to produce a relevant alternative.
  if (slim) {
    const result = lines.join("\n");
    contextCache.set(cacheKey, { text: result, timestamp: Date.now() });
    return result;
  }

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
      L.programLine(
        activeWeek.weekNumber ?? 0,
        activeWeek.phase ?? "",
        activeWeek.title ?? "",
        activeWeek.startDate ?? "?",
      ),
    );

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

    if (todayDay) {
      lines.push("");
      lines.push(L.todayHeader(todayDay.date ?? "?", todayDay.dayName, todayDay.planType, todayDay.workoutTitle));

      const todayMeals = mealsByDay.get(todayDay.id) ?? [];
      if (todayMeals.length > 0) {
        lines.push(L.todayMeals);
        for (const m of todayMeals) {
          const status = m.isCompleted ? " ✓" : "";
          const macros: string[] = [];
          if (m.calories) macros.push(`${m.calories}kcal`);
          if (m.proteinG) macros.push(`P:${m.proteinG}g`);
          if (m.carbsG) macros.push(`${locale === "en" ? "C" : "K"}:${m.carbsG}g`);
          if (m.fatG) macros.push(`${locale === "en" ? "F" : "Y"}:${m.fatG}g`);
          const macroStr = macros.length ? ` [${macros.join(", ")}]` : "";
          lines.push(`  - ${m.mealTime} ${m.mealLabel}${status}: ${m.content}${macroStr}`);
        }
      }

      const todayExercises = exByDay.get(todayDay.id) ?? [];
      if (todayExercises.length > 0) {
        lines.push(L.todayWorkout);
        const bySection: Record<string, string[]> = {};
        for (const ex of todayExercises) {
          if (!bySection[ex.sectionLabel]) bySection[ex.sectionLabel] = [];
          const status = ex.isCompleted ? " ✓" : "";
          const detail =
            ex.sets && ex.reps
              ? `${ex.name} ${ex.sets}x${ex.reps}${ex.restSeconds ? ` (${L.rsec(ex.restSeconds)})` : ""}`
              : ex.durationMinutes
                ? `${ex.name} ${L.dmin(ex.durationMinutes)}`
                : ex.name;
          bySection[ex.sectionLabel].push(`${detail}${status}`);
        }
        for (const [label, items] of Object.entries(bySection)) {
          lines.push(`  ${label}:`);
          for (const item of items) lines.push(`    - ${item}`);
        }
      }

      if (todayMeals.length === 0 && todayExercises.length === 0) {
        lines.push(L.noPlanToday);
      }
    }

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
      lines.push(L.weeklyNutrition);
      lines.push(...mealLines);
    }

    const workoutLines: string[] = [];
    for (const day of weekDays) {
      if (day.planType === "rest") {
        workoutLines.push(`${day.dayName}: ${L.rest}`);
        continue;
      }
      const dayExs = exByDay.get(day.id) ?? [];
      if (dayExs.length === 0) {
        workoutLines.push(`${day.dayName} (${day.workoutTitle ?? day.planType}): ${L.planUndefined}`);
        continue;
      }
      const sections: Record<string, string[]> = {};
      for (const ex of dayExs) {
        if (!sections[ex.sectionLabel]) sections[ex.sectionLabel] = [];
        const detail =
          ex.sets && ex.reps
            ? `${ex.name} ${ex.sets}x${ex.reps}`
            : ex.durationMinutes
              ? `${ex.name} ${L.dmin(ex.durationMinutes)}`
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
      lines.push(L.weeklyWorkout);
      lines.push(...workoutLines);
    }
  }

  const supplementBudget = await getDailySupplementBudget(userId, null);
  if (supplementBudget.list.length > 0) {
    lines.push("");
    lines.push(locale === "en" ? "═══ SUPPLEMENT STACK (Daily) ═══" : "═══ SUPPLEMENT STACK (Günlük) ═══");
    for (const s of supplementBudget.list) {
      const hasMacros = s.calories > 0 || s.protein > 0 || s.carbs > 0 || s.fat > 0;
      if (locale === "en") {
        lines.push(
          hasMacros
            ? `- ${s.name} × ${s.servings} (${s.dosage}): ${s.calories} kcal · ${s.protein}g P · ${s.carbs}g C · ${s.fat}g F`
            : `- ${s.name} × ${s.servings} (${s.dosage})`,
        );
      } else {
        lines.push(
          hasMacros
            ? `- ${s.name} × ${s.servings} (${s.dosage}): ${s.calories} kcal · ${s.protein}g P · ${s.carbs}g K · ${s.fat}g Y`
            : `- ${s.name} × ${s.servings} (${s.dosage})`,
        );
      }
    }
    if (supplementBudget.supplementsCount > 0) {
      lines.push(
        locale === "en"
          ? `Total supplement macros: ${supplementBudget.calories} kcal · ${supplementBudget.protein}g P · ${supplementBudget.carbs}g C · ${supplementBudget.fat}g F`
          : `Toplam supplement makrosu: ${supplementBudget.calories} kcal · ${supplementBudget.protein}g P · ${supplementBudget.carbs}g K · ${supplementBudget.fat}g Y`,
      );
    }
  }

  const progressLines = await loadRecentProgressLines(userId, { emptyState: true });
  if (progressLines.length > 0) {
    lines.push("");
    lines.push(...progressLines);
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
    lines.push(L.waterLine(recentWater.length, avgGlasses, avgTarget, avgLiters));
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
      parts.push(L.sleepAvg(h, m));
    }
    if (validQualities.length > 0) {
      const avgQ = (validQualities.reduce((s, sl) => s + sl.quality!, 0) / validQualities.length).toFixed(1);
      parts.push(L.sleepQuality(avgQ));
    }
    if (parts.length > 0) {
      lines.push(L.sleepLine(recentSleep.length, parts.join(", ")));
    }
  }

  // Readiness — subjective recovery state (skip in slim mode above).
  try {
    const { getReadiness7dAverage, computeTodayReadiness } = await import(
      "@/actions/readiness"
    );
    const [readinessAvg, today] = await Promise.all([
      getReadiness7dAverage(),
      computeTodayReadiness(),
    ]);
    const isEn = locale === "en";
    const subjNote = today.hasSubjective
      ? isEn ? " (user-entered)" : " (kullanıcı girdi)"
      : "";
    const avgNote =
      readinessAvg.average != null && readinessAvg.samples >= 3
        ? isEn
          ? `, last 7d avg: ${Math.round(readinessAvg.average)}/100 (${readinessAvg.samples} days)`
          : `, son 7g ort: ${Math.round(readinessAvg.average)}/100 (${readinessAvg.samples} gün)`
        : "";
    const lead = isEn ? "Readiness — today" : "Hazırlık — bugün";
    lines.push(`${lead}: ${today.score}/100${subjNote}${avgNote}`);
  } catch {
    // optional — skip on any failure
  }

  const result = lines.join("\n");
  contextCache.set(cacheKey, { text: result, timestamp: Date.now() });
  return result;
}

export interface MacroBudgetContext {
  targets: MacroTargets | null;
  consumed: { calories: number; protein: number; carbs: number; fat: number };
  remaining: { calories: number; protein: number; carbs: number; fat: number } | null;
  text: string;
}

export async function getMealMacroBudget(
  userId: string,
  dailyPlanId: number,
  excludeMealId?: number | null,
  locale: Locale = "tr",
): Promise<MacroBudgetContext> {
  const [userRow] = await db
    .select({
      weight: users.weight,
      targetWeight: users.targetWeight,
      height: users.height,
      age: users.age,
      fitnessGoal: users.fitnessGoal,
      gender: users.gender,
      dailyActivityLevel: users.dailyActivityLevel,
      serviceType: users.serviceType,
      targetCalories: users.targetCalories,
      targetProteinG: users.targetProteinG,
      targetCarbsG: users.targetCarbsG,
      targetFatG: users.targetFatG,
    })
    .from(users)
    .where(eq(users.id, userId));

  const [dayRow] = await db
    .select({
      weeklyPlanId: dailyPlans.weeklyPlanId,
      planType: dailyPlans.planType,
    })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));
  // Resolve per-day targets (carb-cycled by planType) so meal variation on
  // a rest day with aggressive cycling doesn't suggest a high-carb meal
  // against a baseline budget that doesn't apply.
  const rawTargets = userRow
    ? await resolveTargetsForDay(userRow, userId, dayRow?.planType ?? null)
    : null;
  const supplementBudget = await getDailySupplementBudget(
    userId,
    dayRow?.weeklyPlanId ?? null,
  );
  const targets = rawTargets
    ? subtractSupplementBudget(rawTargets, supplementBudget)
    : null;

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

  const isEn = locale === "en";
  const C = isEn ? "C" : "K";
  const F = isEn ? "F" : "Y";

  const parts: string[] = [];
  if (targets) {
    parts.push(
      isEn
        ? `Daily target: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat`
        : `Günlük hedef: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g karb, ${targets.fat}g yağ`,
    );
  }
  parts.push(
    isEn
      ? `Today consumed (other meals): ${consumed.calories} kcal, ${consumed.protein}g P, ${consumed.carbs}g ${C}, ${consumed.fat}g ${F}`
      : `Bugün tüketilen (diğer öğünler): ${consumed.calories} kcal, ${consumed.protein}g P, ${consumed.carbs}g ${C}, ${consumed.fat}g ${F}`,
  );
  if (remaining) {
    parts.push(
      isEn
        ? `Remaining budget for this meal: ${remaining.calories} kcal, ${remaining.protein}g P, ${remaining.carbs}g ${C}, ${remaining.fat}g ${F}`
        : `Bu öğün için kalan bütçe: ${remaining.calories} kcal, ${remaining.protein}g P, ${remaining.carbs}g ${C}, ${remaining.fat}g ${F}`,
    );
  }
  if (supplementBudget.supplementsCount > 0) {
    parts.push(
      isEn
        ? `Supplement contribution: ${supplementBudget.calories} kcal/day (already excluded from the meal budget above)`
        : `Supplement contribution: ${supplementBudget.calories} kcal/gün (yukarıdaki öğün bütçesinden zaten çıkarıldı)`,
    );
  }

  return {
    targets,
    consumed,
    remaining,
    text: parts.join("\n"),
  };
}
