import { db } from "@/db";
import { dailyPlans, exercises, weeklyPlans } from "@/db/schema";
import { eq, asc, desc, and, lt } from "drizzle-orm";

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
    return { context: "", currentDayExercises: [] as ExerciseRow[] };
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
    return { context: "", currentDayExercises: [] as ExerciseRow[] };
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

    // Process each previous week (chronological order)
    for (const prevWeek of previousWeeks.reverse()) {
      lines.push("");
      lines.push(
        `── Hafta ${prevWeek.weekNumber}: ${prevWeek.title} (${prevWeek.phase} fazı) ──`,
      );

      const prevDays = await db
        .select({
          id: dailyPlans.id,
          dayName: dailyPlans.dayName,
          dayOfWeek: dailyPlans.dayOfWeek,
          workoutTitle: dailyPlans.workoutTitle,
          planType: dailyPlans.planType,
        })
        .from(dailyPlans)
        .where(eq(dailyPlans.weeklyPlanId, prevWeek.id))
        .orderBy(asc(dailyPlans.dayOfWeek));

      for (const day of prevDays) {
        if (day.planType === "rest") {
          lines.push(`${day.dayName}: Dinlenme`);
          continue;
        }

        const dayExs = await db
          .select({
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
          .where(eq(exercises.dailyPlanId, day.id))
          .orderBy(asc(exercises.sortOrder));

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

    for (const prevDay of sameDayPrevious.reverse()) {
      if (prevDay.planType === "rest") {
        lines.push(
          `Hafta ${prevDay.weekNumber} (${prevDay.date ?? ""}): Dinlenme günü`,
        );
        continue;
      }

      const prevExs = await db
        .select()
        .from(exercises)
        .where(eq(exercises.dailyPlanId, prevDay.id))
        .orderBy(asc(exercises.sortOrder));

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

  const weekExercises = new Map<number, ExerciseRow[]>();
  for (const day of allDays) {
    const dayExercises = await db
      .select()
      .from(exercises)
      .where(eq(exercises.dailyPlanId, day.id))
      .orderBy(asc(exercises.sortOrder));
    weekExercises.set(day.id, dayExercises);
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

  return { context: lines.join("\n"), currentDayExercises };
}
