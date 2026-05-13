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

export const MUSCLE_RAW_TO_GROUP: Record<string, MuscleGroup> = {
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

/**
 * Base sets/week target band per muscle group. Anchored to an
 * intermediate / muscle_gain / 4-day-program profile (typical literature
 * MEV–MRV midpoint). Real bands are produced by `getMuscleVolumeBands`
 * which scales these by fitness level, goal, deload state, and training
 * day count.
 */
const BASE_BANDS: Record<MuscleGroup, { min: number; max: number }> = {
  chest: { min: 10, max: 20 },
  back: { min: 10, max: 20 },
  legs: { min: 10, max: 20 },
  shoulders: { min: 8, max: 16 },
  arms: { min: 6, max: 14 },
};

export interface MuscleVolumeBandsInput {
  fitnessLevel?: string | null;
  fitnessGoal?: string | null;
  deloadWeek?: boolean;
  /** workout + swimming days in the week; rest/nutrition days don't count. */
  trainingDayCount: number;
}

export interface MuscleVolumeBandsResult {
  bands: Record<MuscleGroup, { min: number; max: number }>;
  /** Human-readable summary used in warning messages so the user understands which bands applied. */
  profileLabel: string;
}

/**
 * Build the dynamic sets/week bands for this week. Multipliers are stacked
 * onto the base bands; everything is rounded to the nearest set.
 *
 * - **fitnessLevel**: beginner 0.7× · intermediate 1.0× · advanced 1.2×
 *   (null → intermediate). Beginners can't absorb advanced volume; setting
 *   the same MEV-MRV band for both produces false "below MEV" warnings.
 * - **fitnessGoal**: muscle_gain / weight_gain 1.1× · recomp 1.0× ·
 *   maintain 0.9× · loss 0.85×. Hypertrophy phases tolerate more volume;
 *   cutting phases recover slower so the upper bound contracts.
 * - **deloadWeek**: 0.5× across the board — recovery is the point.
 * - **trainingDayCount**: clamp(count/4, 0.6, 1.4). A 2-day program can't
 *   realistically hit 20 chest sets; a 6-day program can sustain more.
 */
const LEVEL_MULTIPLIERS: Record<"beginner" | "intermediate" | "advanced", number> = {
  beginner: 0.7,
  intermediate: 1,
  advanced: 1.2,
};

const GOAL_MULTIPLIERS: Record<string, number> = {
  muscle_gain: 1.1,
  weight_gain: 1.1,
  recomp: 1,
  maintain: 0.9,
  loss: 0.85,
};

function resolveLevel(value: string | null | undefined): "beginner" | "intermediate" | "advanced" {
  if (value === "beginner" || value === "advanced") return value;
  return "intermediate";
}

export function getMuscleVolumeBands(
  input: MuscleVolumeBandsInput,
): MuscleVolumeBandsResult {
  const level = resolveLevel(input.fitnessLevel);
  const levelMul = LEVEL_MULTIPLIERS[level];

  const goal = input.fitnessGoal ?? "recomp";
  const goalMul = GOAL_MULTIPLIERS[goal] ?? 1;

  const deloadMul = input.deloadWeek ? 0.5 : 1;

  const days = Math.max(0, Math.min(7, input.trainingDayCount));
  const dayMul = Math.max(0.6, Math.min(1.4, days / 4));

  const totalMul = levelMul * goalMul * deloadMul * dayMul;

  const bands: Record<MuscleGroup, { min: number; max: number }> = {
    chest: { min: 0, max: 0 },
    back: { min: 0, max: 0 },
    legs: { min: 0, max: 0 },
    shoulders: { min: 0, max: 0 },
    arms: { min: 0, max: 0 },
  };
  for (const g of Object.keys(BASE_BANDS) as MuscleGroup[]) {
    const base = BASE_BANDS[g];
    bands[g] = {
      min: Math.max(1, Math.round(base.min * totalMul)),
      max: Math.max(2, Math.round(base.max * totalMul)),
    };
  }

  const profileLabel = `${level} / ${goal}${input.deloadWeek ? " / deload" : ""} / ${days}-day program`;
  return { bands, profileLabel };
}

const WORKING_SECTIONS = new Set(["main", "swimming"]);

/**
 * Pure bucketing pass: maps each working exercise to its primary muscle
 * bucket via the supplied demosByName lookup. Shared by `assessMuscleVolume`
 * and the per-muscle progressive-overload comparison so both sides count
 * exactly the same way. The caller is responsible for the batched
 * exerciseDemos query.
 */
export function bucketSetsByMuscleGroupWith(
  plan: AIWeeklyPlan,
  demosByName: Map<string, string[]>,
): { totals: Record<MuscleGroup, number>; unknownExerciseCount: number } {
  const totals: Record<MuscleGroup, number> = {
    chest: 0,
    back: 0,
    legs: 0,
    shoulders: 0,
    arms: 0,
  };
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
      const buckets = new Set<MuscleGroup>();
      for (const m of primary) {
        const g = MUSCLE_RAW_TO_GROUP[m.toLowerCase().trim()];
        if (g) buckets.add(g);
      }
      for (const g of buckets) totals[g] += sets;
    }
  }
  return { totals, unknownExerciseCount };
}

/**
 * Batch the exerciseDemos lookup for every English-named working exercise
 * in the plan. Returns the Map shape consumed by `bucketSetsByMuscleGroupWith`.
 * Pulled out so callers that already have the Map (e.g. the volume check
 * and the progressive-overload check) can share a single DB round trip.
 */
export async function loadDemosForPlan(
  plan: AIWeeklyPlan,
): Promise<Map<string, string[]>> {
  const englishNames = new Set<string>();
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      if (!WORKING_SECTIONS.has(ex.section)) continue;
      if (ex.englishName) englishNames.add(ex.englishName.toLowerCase().trim());
    }
  }
  if (englishNames.size === 0) return new Map();
  const rows = await db
    .select({
      name: exerciseDemos.exerciseNameNorm,
      primary: exerciseDemos.primaryMuscles,
    })
    .from(exerciseDemos)
    .where(inArray(exerciseDemos.exerciseNameNorm, Array.from(englishNames)));
  const map = new Map<string, string[]>();
  for (const row of rows) {
    map.set(row.name, Array.isArray(row.primary) ? (row.primary as string[]) : []);
  }
  return map;
}

export interface MuscleVolumeReport {
  /** Bucketed set totals across the plan, capped at working sections. */
  totals: Record<MuscleGroup, number>;
  /** Plan exercises that had no exerciseDemos row (unknown taxonomy). */
  unknownExerciseCount: number;
  /** Warnings — empty array when every bucket lands inside its band. */
  warnings: string[];
  /** Bands that were applied (echoed back for telemetry / debugging). */
  appliedBands: Record<MuscleGroup, { min: number; max: number }>;
}

/**
 * Assesses muscle-group volume distribution against caller-supplied bands.
 * Returns warnings + raw totals so the caller can log telemetry or surface
 * them in the quality summary. Pass the bands from `getMuscleVolumeBands`
 * so the assessment scales with fitness level / goal / deload / day count.
 */
export async function assessMuscleVolume(
  plan: AIWeeklyPlan,
  bandsInput: MuscleVolumeBandsResult,
): Promise<MuscleVolumeReport> {
  const demosByName = await loadDemosForPlan(plan);
  const { totals, unknownExerciseCount } = bucketSetsByMuscleGroupWith(plan, demosByName);
  const warnings: string[] = [];
  for (const group of Object.keys(bandsInput.bands) as MuscleGroup[]) {
    const band = bandsInput.bands[group];
    const total = totals[group];
    if (total < band.min) {
      warnings.push(
        `${group} weekly set total ${total} below MEV ${band.min} (${bandsInput.profileLabel}) — add volume or accept under-stimulus.`,
      );
    } else if (total > band.max) {
      warnings.push(
        `${group} weekly set total ${total} exceeds MRV ${band.max} (${bandsInput.profileLabel}) — risk of accumulated fatigue.`,
      );
    }
  }
  return { totals, unknownExerciseCount, warnings, appliedBands: bandsInput.bands };
}
