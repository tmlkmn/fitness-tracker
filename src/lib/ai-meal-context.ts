import { db } from "@/db";
import {
  dailyPlans,
  exercises,
  meals,
  weeklyPlans,
} from "@/db/schema";
import { eq, asc, desc, and, ne, isNotNull, inArray } from "drizzle-orm";
import { normalizeEvent, MEAL_EVENTS } from "@/lib/routine-constants";
import {
  loadUserProfileRow,
  renderUserProfileLines,
} from "@/lib/ai-user-profile-block";
import { loadRecentProgressLines } from "@/lib/ai-progress-block";

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
  // Use the shared profile-block helper so allergens, manual macro targets,
  // routine, supplements, and fitness level all render in one consistent
  // format across meal-context / weekly-context / user-context.
  const user = await loadUserProfileRow(userId);

  if (user) {
    lines.push(
      ...renderUserProfileLines(user, {
        includeAgeAndService: true,
        compact: true,
      }),
    );

    // Today-specific: highlight which meal labels the user has defined for
    // this particular day (week vs weekend routine). The shared block lists
    // both routines but doesn't pick one for "today" — we do that here.
    const isWeekend = currentDay.dayOfWeek === 5 || currentDay.dayOfWeek === 6;
    const routineRaw = isWeekend
      ? (user.weekendRoutine as { time: string; event: string }[] | null) ?? (user.dailyRoutine as { time: string; event: string }[] | null)
      : (user.dailyRoutine as { time: string; event: string }[] | null);

    if (routineRaw && Array.isArray(routineRaw) && routineRaw.length > 0) {
      const definedMeals = routineRaw
        .map((r) => normalizeEvent(r.event))
        .filter((event) => MEAL_EVENTS.includes(event));
      lines.push("");
      if (definedMeals.length > 0) {
        lines.push(
          `Bugün (${isWeekend ? "hafta sonu" : "hafta içi"}) tanımlı öğünler: ${definedMeals.join(", ")}. Tanımlanmamış saatlerdeki öğünleri "Ara Öğün" olarak etiketle.`,
        );
      } else {
        lines.push(
          'Bugün için standart öğün etiketi tanımlanmamış — öğünleri "Ara Öğün" olarak etiketle.',
        );
      }
    }
  }

  const progressLines = await loadRecentProgressLines(userId, { limit: 5 });
  if (progressLines.length > 0) {
    lines.push("");
    lines.push(...progressLines);
  }

  // ─── 3. Today's workout program (skip for nutrition-only users) ─────

  if (user?.serviceType === "nutrition") {
    lines.push("");
    lines.push("═══ BUGÜNÜN PLANI ═══");
    lines.push(
      `Gün: ${currentDay.dayName} (${currentDay.date ?? ""})`,
    );
    lines.push("Not: Bu kullanıcı sadece beslenme hizmeti alıyor, antrenman programı yok.");
  } else {
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

    // Batch: all meals for non-current days in a single query
    const otherDayIds = weekDays
      .filter((d) => d.id !== currentDay.id)
      .map((d) => d.id);
    const allWeekMeals = otherDayIds.length
      ? await db
          .select({
            dailyPlanId: meals.dailyPlanId,
            mealTime: meals.mealTime,
            mealLabel: meals.mealLabel,
            content: meals.content,
            calories: meals.calories,
          })
          .from(meals)
          .where(inArray(meals.dailyPlanId, otherDayIds))
          .orderBy(asc(meals.sortOrder))
      : [];
    const weekMealsByDay = new Map<number, typeof allWeekMeals>();
    for (const m of allWeekMeals) {
      if (m.dailyPlanId == null) continue;
      const arr = weekMealsByDay.get(m.dailyPlanId) ?? [];
      arr.push(m);
      weekMealsByDay.set(m.dailyPlanId, arr);
    }

    for (const day of weekDays) {
      if (day.id === currentDay.id) continue;
      const dayMeals = weekMealsByDay.get(day.id) ?? [];

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

      // Batch: all prev-same-day meals in a single query
      const prevDayIds = previousSameDayPlans.map((d) => d.id);
      const allPrevMeals = await db
        .select({
          dailyPlanId: meals.dailyPlanId,
          mealTime: meals.mealTime,
          mealLabel: meals.mealLabel,
          content: meals.content,
          calories: meals.calories,
          proteinG: meals.proteinG,
          carbsG: meals.carbsG,
          fatG: meals.fatG,
        })
        .from(meals)
        .where(inArray(meals.dailyPlanId, prevDayIds))
        .orderBy(asc(meals.sortOrder));
      const prevMealsByDay = new Map<number, typeof allPrevMeals>();
      for (const m of allPrevMeals) {
        if (m.dailyPlanId == null) continue;
        const arr = prevMealsByDay.get(m.dailyPlanId) ?? [];
        arr.push(m);
        prevMealsByDay.set(m.dailyPlanId, arr);
      }

      for (const prevDay of previousSameDayPlans) {
        const prevMeals = prevMealsByDay.get(prevDay.id) ?? [];

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
