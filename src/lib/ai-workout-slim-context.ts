import { db } from "@/db";
import { dailyPlans, exercises, weeklyPlans, exerciseDemos } from "@/db/schema";
import { eq, asc, desc, and, lt, inArray, ne } from "drizzle-orm";

type ExerciseRow = typeof exercises.$inferSelect;

function formatExerciseLine(ex: Pick<ExerciseRow, "name" | "sets" | "reps" | "restSeconds" | "durationMinutes" | "notes">): string {
  const parts: string[] = [ex.name];
  if (ex.sets && ex.reps) parts.push(`${ex.sets}x${ex.reps}`);
  if (ex.durationMinutes) parts.push(`${ex.durationMinutes}dk`);
  if (ex.restSeconds) parts.push(`${ex.restSeconds}sn dinlenme`);
  if (ex.notes) parts.push(`(${ex.notes})`);
  return parts.join(", ");
}

/**
 * Slim context for section replacement — only what matters for designing one
 * section: today's other sections + same section from 1 previous week.
 * Drops the full 4-week history and irrelevant same-day progressions that
 * full buildWeeklyWorkoutContext includes.
 */
export async function buildSectionContext(
  dailyPlanId: number,
  section: string,
): Promise<{ context: string; sectionExercises: ExerciseRow[]; planType: string | null }> {
  const [currentDay] = await db
    .select({
      id: dailyPlans.id,
      dayName: dailyPlans.dayName,
      dayOfWeek: dailyPlans.dayOfWeek,
      workoutTitle: dailyPlans.workoutTitle,
      planType: dailyPlans.planType,
      weeklyPlanId: dailyPlans.weeklyPlanId,
    })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));

  if (!currentDay) return { context: "", sectionExercises: [], planType: null };

  const lines: string[] = [];

  // Today's full program (all sections) — grouped, compact
  const todayEx = await db
    .select()
    .from(exercises)
    .where(eq(exercises.dailyPlanId, dailyPlanId))
    .orderBy(asc(exercises.sortOrder));

  const sectionExercises = todayEx.filter((ex) => ex.section === section);

  if (todayEx.length > 0) {
    lines.push(
      `═══ BUGÜN: ${currentDay.dayName} - ${currentDay.workoutTitle ?? ""} (planType=${currentDay.planType}) ═══`,
    );
    const bySection: Record<string, string[]> = {};
    for (const ex of todayEx) {
      if (!bySection[ex.sectionLabel]) bySection[ex.sectionLabel] = [];
      const marker = ex.section === section ? ">>> " : "";
      bySection[ex.sectionLabel].push(`${marker}${formatExerciseLine(ex)}`);
    }
    for (const [label, items] of Object.entries(bySection)) {
      lines.push(`${label}:`);
      for (const it of items) lines.push(`  - ${it}`);
    }
  }

  // Previous week — same day, same section only
  if (currentDay.weeklyPlanId) {
    const [currentWeek] = await db
      .select({
        userId: weeklyPlans.userId,
        weekNumber: weeklyPlans.weekNumber,
      })
      .from(weeklyPlans)
      .where(eq(weeklyPlans.id, currentDay.weeklyPlanId));

    if (currentWeek) {
      const [prevSameDay] = await db
        .select({
          id: dailyPlans.id,
          weekNumber: weeklyPlans.weekNumber,
          date: dailyPlans.date,
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
        .limit(1);

      if (prevSameDay) {
        const prevSectionEx = await db
          .select()
          .from(exercises)
          .where(
            and(
              eq(exercises.dailyPlanId, prevSameDay.id),
              eq(exercises.section, section),
            ),
          )
          .orderBy(asc(exercises.sortOrder));

        if (prevSectionEx.length > 0) {
          lines.push("");
          lines.push(
            `═══ ÖNCEKİ HAFTA (${prevSameDay.date ?? `Hafta ${prevSameDay.weekNumber}`}) — aynı section için referans ═══`,
          );
          for (const ex of prevSectionEx) {
            lines.push(`  - ${formatExerciseLine(ex)}`);
          }
        }
      }
    }
  }

  return {
    context: lines.join("\n"),
    sectionExercises,
    planType: currentDay.planType,
  };
}

/**
 * Slim context for single-exercise alternatives — only muscle group, today's
 * sibling exercises, and the current exercise's recent usage history (staleness).
 * Drops the full 4-week program history and full-week details.
 */
export async function buildExerciseAlternativesContext(
  exerciseId: number,
  dailyPlanId: number,
): Promise<string> {
  const [currentExercise] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, exerciseId));

  if (!currentExercise) return "";

  const lines: string[] = [];

  // 1. Muscle group anchor from exerciseDemos (if we have an englishName match)
  if (currentExercise.englishName) {
    const demoNameNorm = currentExercise.englishName.toLowerCase().trim();
    const [demo] = await db
      .select({
        primaryMuscles: exerciseDemos.primaryMuscles,
        secondaryMuscles: exerciseDemos.secondaryMuscles,
        equipment: exerciseDemos.equipment,
      })
      .from(exerciseDemos)
      .where(eq(exerciseDemos.exerciseNameNorm, demoNameNorm));

    if (demo) {
      const primary = Array.isArray(demo.primaryMuscles) ? (demo.primaryMuscles as string[]) : [];
      const secondary = Array.isArray(demo.secondaryMuscles) ? (demo.secondaryMuscles as string[]) : [];
      if (primary.length) lines.push(`Birincil kas grubu: ${primary.join(", ")}`);
      if (secondary.length) lines.push(`İkincil kas grubu: ${secondary.join(", ")}`);
      if (demo.equipment) lines.push(`Ekipman: ${demo.equipment}`);
    }
  }

  // 2. Today's sibling exercises — avoid suggesting something already in the plan
  const todaySiblings = await db
    .select({
      name: exercises.name,
      sectionLabel: exercises.sectionLabel,
    })
    .from(exercises)
    .where(
      and(
        eq(exercises.dailyPlanId, dailyPlanId),
        ne(exercises.id, exerciseId),
      ),
    )
    .orderBy(asc(exercises.sortOrder));

  if (todaySiblings.length > 0) {
    lines.push("");
    lines.push("═══ BUGÜNÜN DİĞER EGZERSİZLERİ (tekrara düşme) ═══");
    for (const s of todaySiblings) {
      lines.push(`  - ${s.sectionLabel}: ${s.name}`);
    }
  }

  // 3. Staleness — how many of the last 4 weeks used this exact exercise
  const [currentDay] = await db
    .select({ weeklyPlanId: dailyPlans.weeklyPlanId })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, dailyPlanId));

  if (currentDay?.weeklyPlanId) {
    const [currentWeek] = await db
      .select({
        userId: weeklyPlans.userId,
        weekNumber: weeklyPlans.weekNumber,
      })
      .from(weeklyPlans)
      .where(eq(weeklyPlans.id, currentDay.weeklyPlanId));

    if (currentWeek) {
      const recentWeeks = await db
        .select({ id: weeklyPlans.id, weekNumber: weeklyPlans.weekNumber })
        .from(weeklyPlans)
        .where(
          and(
            eq(weeklyPlans.userId, currentWeek.userId),
            lt(weeklyPlans.weekNumber, currentWeek.weekNumber),
          ),
        )
        .orderBy(desc(weeklyPlans.weekNumber))
        .limit(4);

      if (recentWeeks.length > 0) {
        const weekIds = recentWeeks.map((w) => w.id);
        const dayRows = await db
          .select({ id: dailyPlans.id, weeklyPlanId: dailyPlans.weeklyPlanId })
          .from(dailyPlans)
          .where(inArray(dailyPlans.weeklyPlanId, weekIds));

        if (dayRows.length > 0) {
          const nameNorm = currentExercise.name.toLowerCase().trim();
          const dayIds = dayRows.map((d) => d.id);
          const exRows = await db
            .select({
              dailyPlanId: exercises.dailyPlanId,
              name: exercises.name,
            })
            .from(exercises)
            .where(inArray(exercises.dailyPlanId, dayIds));

          const dayToWeek = new Map<number, number>();
          for (const d of dayRows) {
            if (d.weeklyPlanId != null) dayToWeek.set(d.id, d.weeklyPlanId);
          }
          const weeksWithThisExercise = new Set<number>();
          for (const ex of exRows) {
            if (ex.name.toLowerCase().trim() === nameNorm && ex.dailyPlanId != null) {
              const weekId = dayToWeek.get(ex.dailyPlanId);
              if (weekId != null) weeksWithThisExercise.add(weekId);
            }
          }

          if (weeksWithThisExercise.size >= 2) {
            lines.push("");
            lines.push(
              `STALE SİNYAL: "${currentExercise.name}" son ${weeksWithThisExercise.size} haftadır tekrarlanıyor — alternatifleri MUTLAKA farklı açılardan / varyasyonlarla öner.`,
            );
          }
        }
      }
    }
  }

  return lines.join("\n");
}
