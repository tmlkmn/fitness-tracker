/**
 * Bucket the AI's produced workout exercises by primary muscle group and
 * compare weekly set totals against widely-cited target bands (Schoenfeld
 * et al. minimum-effective vs. maximum-recoverable volume). Emits soft
 * warnings — never blocks plan application. Sits alongside the
 * progressive-overload validator: this one watches the *distribution* of
 * volume across muscle groups, that one watches week-to-week progression.
 *
 * Lookup uses the existing `exercise_demos` table (loaded by the demo modal
 * + AI alternatives flow). Exercises with no demo row simply don't contribute
 * to the count and emit no warning — we can't penalize the user for moves
 * we don't have taxonomy on.
 */

import "server-only";
import { db } from "@/db";
import { exerciseDemos } from "@/db/schema";
import { inArray } from "drizzle-orm";
import type { AIWeeklyPlan } from "@/lib/ai-weekly-types";

/** High-level muscle buckets that map raw exerciseDemos muscle strings. */
export type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "arms";

const RAW_TO_GROUP: Record<string, MuscleGroup> = {
  chest: "chest",
  pectorals: "chest",
  lats: "back",
  middle_back: "back",
  lower_back: "back",
  traps: "back",
  quadriceps: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
  abductors: "legs",
  adductors: "legs",
  shoulders: "shoulders",
  delts: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
};

/** Sets/week target band per muscle group. */
const TARGET_BANDS: Record<MuscleGroup, { min: number; max: number }> = {
  chest: { min: 10, max: 20 },
  back: { min: 10, max: 20 },
  legs: { min: 10, max: 20 },
  shoulders: { min: 8, max: 16 },
  arms: { min: 6, max: 14 },
};

const WORKING_SECTIONS = new Set(["main", "swimming"]);

export interface MuscleVolumeReport {
  /** Bucketed set totals across the plan, capped at working sections. */
  totals: Record<MuscleGroup, number>;
  /** Plan exercises that had no exerciseDemos row (unknown taxonomy). */
  unknownExerciseCount: number;
  /** Warnings — empty array when every bucket lands inside its band. */
  warnings: string[];
}

/**
 * Assesses muscle-group volume distribution. Returns warnings + raw totals
 * so the caller can log telemetry or surface them in the quality summary.
 */
export async function assessMuscleVolume(
  plan: AIWeeklyPlan,
): Promise<MuscleVolumeReport> {
  const totals: Record<MuscleGroup, number> = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
  };
  const warnings: string[] = [];

  // Collect English names for a single batched lookup.
  const englishNames = new Set<string>();
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      if (!WORKING_SECTIONS.has(ex.section)) continue;
      if (ex.englishName) englishNames.add(ex.englishName.toLowerCase().trim());
    }
  }
  if (englishNames.size === 0) {
    return { totals, unknownExerciseCount: 0, warnings };
  }

  const demoRows = await db
    .select({
      name: exerciseDemos.exerciseNameNorm,
      primary: exerciseDemos.primaryMuscles,
    })
    .from(exerciseDemos)
    .where(inArray(exerciseDemos.exerciseNameNorm, Array.from(englishNames)));

  const demosByName = new Map<string, string[]>();
  for (const row of demoRows) {
    const primary = Array.isArray(row.primary) ? (row.primary as string[]) : [];
    demosByName.set(row.name, primary);
  }

  let unknownExerciseCount = 0;
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      if (!WORKING_SECTIONS.has(ex.section)) continue;
      const sets = ex.sets ?? 1;
      const key = ex.englishName?.toLowerCase().trim();
      const primary = key ? demosByName.get(key) : undefined;
      if (!primary || primary.length === 0) {
        unknownExerciseCount += 1;
        continue;
      }
      // Credit the set to every distinct bucket the primary muscles map to.
      // Mapping to multiple buckets is rare; same-bucket dupes are de-duped.
      const buckets = new Set<MuscleGroup>();
      for (const m of primary) {
        const g = RAW_TO_GROUP[m.toLowerCase().trim()];
        if (g) buckets.add(g);
      }
      for (const g of buckets) {
        totals[g] += sets;
      }
    }
  }

  for (const group of Object.keys(TARGET_BANDS) as MuscleGroup[]) {
    const band = TARGET_BANDS[group];
    const total = totals[group];
    if (total < band.min) {
      warnings.push(
        `${group} weekly set total ${total} below MEV ${band.min} — add volume or accept under-stimulus.`,
      );
    } else if (total > band.max) {
      warnings.push(
        `${group} weekly set total ${total} exceeds MRV ${band.max} — risk of accumulated fatigue.`,
      );
    }
  }

  return { totals, unknownExerciseCount, warnings };
}
