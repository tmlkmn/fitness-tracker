import { db } from "@/db";
import { dailyPlans, exercises, weeklyPlans } from "@/db/schema";
import { eq, asc, desc, and, lt, inArray } from "drizzle-orm";

type ExerciseRow = typeof exercises.$inferSelect;

/**
 * Builds comprehensive workout context including:
 * - Current week's full program
 * - Previous weeks' same-day programs (progressive overload tracking)
 * - Program history summary for periodization awareness
 */
export async function buildWeeklyWorkoutContext(dailyPlanId: number) {
  // Get the daily plan with its weekly plan info
  const [currentDay] = await db
    .select({
      id: dailyPlans.id,
      dayName: dailyPlans.dayName,
      dayOfWeek: dailyPlans.dayOfWeek,
      workoutTitle: dailyPlans.workoutTitle,
      planType: dailyPlans.planType,
      date: dailyPlans.date,
      weeklyPlanId: dailyPlans.weeklyPlanId,
    })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));

  if (!currentDay?.weeklyPlanId) {
    return {
      context: "",
      currentDayExercises: [] as ExerciseRow[],
      planType: currentDay?.planType ?? null,
    };
  }

  // Get current weekly plan info (with userId for querying previous weeks)
  const [currentWeek] = await db
    .select({
      id: weeklyPlans.id,
      weekNumber: weeklyPlans.weekNumber,
      title: weeklyPlans.title,
      phase: weeklyPlans.phase,
      userId: weeklyPlans.userId,
      startDate: weeklyPlans.startDate,
    })
    .from(weeklyPlans)
    .where(eq(weeklyPlans.id, currentDay.weeklyPlanId));

  if (!currentWeek) {
    return {
      context: "",
      currentDayExercises: [] as ExerciseRow[],
      planType: currentDay.planType,
    };
  }

  const lines: string[] = [];

  // ─── 1. Previous weeks' program history (up to last 4 weeks) ──────────

  const previousWeeks = await db
    .select({
      id: weeklyPlans.id,
      weekNumber: weeklyPlans.weekNumber,
      title: weeklyPlans.title,
      phase: weeklyPlans.phase,
      startDate: weeklyPlans.startDate,
    })
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.userId, currentWeek.userId),
        lt(weeklyPlans.weekNumber, currentWeek.weekNumber),
      ),
    )
    .orderBy(desc(weeklyPlans.weekNumber))
    .limit(4);

  if (previousWeeks.length > 0) {
    lines.push("═══ ANTRENMAN GEÇMİŞİ (Önceki Haftalar) ═══");

    // Batch: all days for all previous weeks in a single query
    const prevWeekIds = previousWeeks.map((w) => w.id);
    const allPrevDays = await db
      .select({
        id: dailyPlans.id,
        weeklyPlanId: dailyPlans.weeklyPlanId,
        dayName: dailyPlans.dayName,
        dayOfWeek: dailyPlans.dayOfWeek,
        workoutTitle: dailyPlans.workoutTitle,
        planType: dailyPlans.planType,
      })
      .from(dailyPlans)
      .where(inArray(dailyPlans.weeklyPlanId, prevWeekIds))
      .orderBy(asc(dailyPlans.dayOfWeek));

    // Group days by weeklyPlanId
    const daysByWeek = new Map<number, typeof allPrevDays>();
    for (const day of allPrevDays) {
      if (day.weeklyPlanId == null) continue;
      const arr = daysByWeek.get(day.weeklyPlanId) ?? [];
      arr.push(day);
      daysByWeek.set(day.weeklyPlanId, arr);
    }

    // Batch: all exercises for non-rest days in one query
    const nonRestDayIds = allPrevDays
      .filter((d) => d.planType !== "rest")
      .map((d) => d.id);
    const allPrevEx = nonRestDayIds.length
      ? await db
          .select({
            dailyPlanId: exercises.dailyPlanId,
            name: exercises.name,
            section: exercises.section,
            sectionLabel: exercises.sectionLabel,
            sets: exercises.sets,
            reps: exercises.reps,
            restSeconds: exercises.restSeconds,
            durationMinutes: exercises.durationMinutes,
            notes: exercises.notes,
          })
          .from(exercises)
          .where(inArray(exercises.dailyPlanId, nonRestDayIds))
          .orderBy(asc(exercises.sortOrder))
      : [];

    const exByDay = new Map<number, typeof allPrevEx>();
    for (const ex of allPrevEx) {
      if (ex.dailyPlanId == null) continue;
      const arr = exByDay.get(ex.dailyPlanId) ?? [];
      arr.push(ex);
      exByDay.set(ex.dailyPlanId, arr);
    }

    // Process each previous week (chronological order)
    for (const prevWeek of previousWeeks.reverse()) {
      lines.push("");
      lines.push(
        `── Hafta ${prevWeek.weekNumber}: ${prevWeek.title} (${prevWeek.phase} fazı) ──`,
      );

      const prevDays = daysByWeek.get(prevWeek.id) ?? [];

      for (const day of prevDays) {
        if (day.planType === "rest") {
          lines.push(`${day.dayName}: Dinlenme`);
          continue;
        }

        const dayExs = exByDay.get(day.id) ?? [];

        if (dayExs.length === 0) {
          lines.push(
            `${day.dayName} (${day.workoutTitle ?? ""}): Program yok`,
          );
          continue;
        }

        // Group by section
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

    // Staleness signal: count how many distinct weeks each exercise appears in.
    // AI can't be trusted to count; precompute so the prompt has an explicit
    // "change this" list.
    const weeksPerExercise = new Map<string, Set<number>>();
    const displayNameByKey = new Map<string, string>();
    const dayToWeekId = new Map<number, number>();
    for (const d of allPrevDays) {
      if (d.weeklyPlanId != null) dayToWeekId.set(d.id, d.weeklyPlanId);
    }
    for (const ex of allPrevEx) {
      if (ex.dailyPlanId == null) continue;
      const weekId = dayToWeekId.get(ex.dailyPlanId);
      if (weekId == null) continue;
      const key = ex.name.toLowerCase().trim();
      if (!weeksPerExercise.has(key)) weeksPerExercise.set(key, new Set<number>());
      weeksPerExercise.get(key)!.add(weekId);
      if (!displayNameByKey.has(key)) displayNameByKey.set(key, ex.name);
    }
    const staleEntries = Array.from(weeksPerExercise.entries())
      .filter(([, weeks]) => weeks.size >= 4)
      .map(([key, weeks]) => `${displayNameByKey.get(key) ?? key}: ${weeks.size} hafta`)
      .sort();

    if (staleEntries.length > 0) {
      lines.push("");
      lines.push("═══ STALE EGZERSİZLER (4+ hafta üst üste kullanıldı — varyasyonla DEĞİŞTİR) ═══");
      for (const entry of staleEntries) lines.push(`  - ${entry}`);
    }
  }

  // ─── 2. Same-day progression tracking ─────────────────────────────────

  // Find the same day-of-week from previous weeks to show progression
  const sameDayPrevious = await db
    .select({
      id: dailyPlans.id,
      dayName: dailyPlans.dayName,
      workoutTitle: dailyPlans.workoutTitle,
      planType: dailyPlans.planType,
      date: dailyPlans.date,
      weekNumber: weeklyPlans.weekNumber,
      weekTitle: weeklyPlans.title,
      phase: weeklyPlans.phase,
    })
    .from(dailyPlans)
    .innerJoin(weeklyPlans, eq(dailyPlans.weeklyPlanId, weeklyPlans.id))
    .where(
      and(
        eq(weeklyPlans.userId, currentWeek.userId),
        eq(dailyPlans.dayOfWeek, currentDay.dayOfWeek),
        lt(weeklyPlans.weekNumber, currentWeek.weekNumber),
      ),
    )
    .orderBy(desc(weeklyPlans.weekNumber))
    .limit(3);

  if (sameDayPrevious.length > 0) {
    lines.push("");
    lines.push(
      `═══ ${currentDay.dayName} GÜNÜ İLERLEME GEÇMİŞİ ═══`,
    );
    lines.push(
      "(Aşağıda bu günün önceki haftalardaki programları var. Progresif yüklenme için referans al)",
    );

    // Batch: all exercises for non-rest same-day entries
    const sameDayIds = sameDayPrevious
      .filter((d) => d.planType !== "rest")
      .map((d) => d.id);
    const sameDayExercises = sameDayIds.length
      ? await db
          .select()
          .from(exercises)
          .where(inArray(exercises.dailyPlanId, sameDayIds))
          .orderBy(asc(exercises.sortOrder))
      : [];
    const sameDayExByPlan = new Map<number, typeof sameDayExercises>();
    for (const ex of sameDayExercises) {
      if (ex.dailyPlanId == null) continue;
      const arr = sameDayExByPlan.get(ex.dailyPlanId) ?? [];
      arr.push(ex);
      sameDayExByPlan.set(ex.dailyPlanId, arr);
    }

    for (const prevDay of sameDayPrevious.reverse()) {
      if (prevDay.planType === "rest") {
        lines.push(
          `Hafta ${prevDay.weekNumber} (${prevDay.date ?? ""}): Dinlenme günü`,
        );
        continue;
      }

      const prevExs = sameDayExByPlan.get(prevDay.id) ?? [];

      if (prevExs.length === 0) continue;

      lines.push("");
      lines.push(
        `Hafta ${prevDay.weekNumber} - ${prevDay.workoutTitle ?? prevDay.dayName} (${prevDay.date ?? ""}, ${prevDay.phase}):`,
      );

      let curSection = "";
      for (const ex of prevExs) {
        if (ex.sectionLabel !== curSection) {
          curSection = ex.sectionLabel;
          lines.push(`  ${curSection}:`);
        }
        const parts: string[] = [ex.name];
        if (ex.sets && ex.reps) parts.push(`${ex.sets}x${ex.reps}`);
        if (ex.durationMinutes) parts.push(`${ex.durationMinutes}dk`);
        if (ex.restSeconds) parts.push(`${ex.restSeconds}sn dinlenme`);
        if (ex.notes) parts.push(`(${ex.notes})`);
        lines.push(`    - ${parts.join(", ")}`);
      }
    }
  }

  // ─── 3. Current week program ──────────────────────────────────────────

  lines.push("");
  lines.push(
    `═══ MEVCUT HAFTA: Hafta ${currentWeek.weekNumber} - ${currentWeek.title} (${currentWeek.phase} fazı) ═══`,
  );

  const allDays = await db
    .select({
      id: dailyPlans.id,
      dayName: dailyPlans.dayName,
      workoutTitle: dailyPlans.workoutTitle,
      planType: dailyPlans.planType,
      dayOfWeek: dailyPlans.dayOfWeek,
    })
    .from(dailyPlans)
    .where(eq(dailyPlans.weeklyPlanId, currentDay.weeklyPlanId))
    .orderBy(asc(dailyPlans.dayOfWeek));

  // Batch: all exercises for this week's days in one query
  const weekExercises = new Map<number, ExerciseRow[]>();
  const weekDayIds = allDays.map((d) => d.id);
  if (weekDayIds.length > 0) {
    const weekEx = await db
      .select()
      .from(exercises)
      .where(inArray(exercises.dailyPlanId, weekDayIds))
      .orderBy(asc(exercises.sortOrder));
    for (const ex of weekEx) {
      if (ex.dailyPlanId == null) continue;
      const arr = weekExercises.get(ex.dailyPlanId) ?? [];
      arr.push(ex);
      weekExercises.set(ex.dailyPlanId, arr);
    }
  }

  const currentDayExercises = weekExercises.get(currentDay.id) ?? [];

  for (const day of allDays) {
    if (day.planType === "rest") {
      lines.push(`${day.dayName}: Dinlenme günü`);
      continue;
    }

    const dayExs = weekExercises.get(day.id) ?? [];
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

    const isToday = day.id === currentDay.id;
    lines.push(
      `${isToday ? ">>> " : ""}${day.dayName} (${day.workoutTitle ?? ""})${isToday ? " [BUGÜN] <<<" : ""}: ${sectionSummary}`,
    );
  }

  // ─── 4. Detailed current day breakdown ────────────────────────────────

  if (currentDayExercises.length > 0) {
    lines.push("");
    lines.push(
      `═══ BUGÜNÜN DETAYLI PROGRAMI: ${currentDay.dayName} - ${currentDay.workoutTitle ?? ""} ═══`,
    );

    let currentSection = "";
    for (const ex of currentDayExercises) {
      if (ex.sectionLabel !== currentSection) {
        currentSection = ex.sectionLabel;
        lines.push(`${currentSection}:`);
      }
      const parts: string[] = [ex.name];
      if (ex.sets && ex.reps) parts.push(`${ex.sets}x${ex.reps}`);
      if (ex.durationMinutes) parts.push(`${ex.durationMinutes}dk`);
      if (ex.restSeconds) parts.push(`${ex.restSeconds}sn dinlenme`);
      if (ex.notes) parts.push(`(${ex.notes})`);
      lines.push(`  - ${parts.join(", ")}`);
    }
  }

  // ─── 5. Week progression summary ──────────────────────────────────────

  lines.push("");
  lines.push(
    `Hafta numarası: ${currentWeek.weekNumber} | Faz: ${currentWeek.phase} | Bugün: ${currentDay.dayName} (${currentDay.date ?? ""})`,
  );

  return {
    context: lines.join("\n"),
    currentDayExercises,
    planType: currentDay.planType,
  };
}
