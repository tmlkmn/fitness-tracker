/**
 * Deterministic set adjuster for weekly workout plans. The model is asked to
 * respect per-muscle weekly set bands (MEV–MRV) but routinely misses them by
 * a few sets; retrying the whole week for that is slow and rarely fixes it.
 * This nudges the totals into band by adding or removing single sets on the
 * existing main-work exercises — never inventing or deleting exercises — and
 * runs before the volume / overload validators, so their warnings describe
 * the plan the user actually gets.
 */

import type { AIWeeklyPlan } from "@/lib/ai-weekly-types";
import {
  bucketSetsByMuscleGroupWith,
  MUSCLE_RAW_TO_GROUP,
  type MuscleGroup,
  type MuscleVolumeBandsResult,
} from "@/lib/muscle-volume-validator";

const MIN_SETS = 2;
const MAX_SETS = 5;
/** Per exercise, so no single movement is rewritten beyond recognition. */
const MAX_DELTA_PER_EXERCISE = 2;
/** Total single-set edits per week. */
const MAX_CHANGES = 16;

interface Candidate {
  dayIdx: number;
  exIdx: number;
  groups: Set<MuscleGroup>;
  sets: number;
}

export interface VolumeAdjustment {
  plan: AIWeeklyPlan;
  /** Human-readable edits, e.g. "chest +1 set: Incline Bench Press (day 2)". */
  changes: string[];
}

export function adjustSetsToBands(
  plan: AIWeeklyPlan,
  demosByName: Map<string, string[]>,
  bands: MuscleVolumeBandsResult,
  skipDows: ReadonlySet<number> = new Set(),
): VolumeAdjustment {
  const out: AIWeeklyPlan = structuredClone(plan);
  const changes: string[] = [];
  const delta = new Map<string, number>();

  const groupsOf = (englishName: string | null): Set<MuscleGroup> => {
    const primary = englishName ? demosByName.get(englishName.toLowerCase().trim()) : undefined;
    const groups = new Set<MuscleGroup>();
    for (const m of primary ?? []) {
      const g = MUSCLE_RAW_TO_GROUP[m.toLowerCase().trim()];
      if (g) groups.add(g);
    }
    return groups;
  };

  const candidates = (): Candidate[] =>
    out.days.flatMap((day, dayIdx) =>
      skipDows.has(day.dayOfWeek)
        ? []
        : day.exercises.flatMap((ex, exIdx) =>
            ex.section === "main" && ex.sets != null
              ? [{ dayIdx, exIdx, groups: groupsOf(ex.englishName), sets: ex.sets }]
              : [],
          ),
    );

  for (let step = 0; step < MAX_CHANGES; step++) {
    const totals = bucketSetsByMuscleGroupWith(out, demosByName).totals;
    const groups = Object.keys(bands.bands) as MuscleGroup[];
    const under = groups
      .map((g) => ({ g, gap: bands.bands[g].min - totals[g] }))
      .filter((x) => x.gap > 0)
      .sort((a, b) => b.gap - a.gap);
    const over = groups
      .map((g) => ({ g, gap: totals[g] - bands.bands[g].max }))
      .filter((x) => x.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    // Worst gap first; a muscle with no usable exercise yields to the next one.
    const targets = [
      ...under.map((x) => ({ ...x, adding: true })),
      ...over.map((x) => ({ ...x, adding: false })),
    ];
    const pool = candidates();
    let applied = false;
    for (const target of targets) {
      const { adding } = target;
      const sign = adding ? 1 : -1;
      // Prefer single-muscle moves; skip edits that would push another muscle
      // out of its band in the opposite direction.
      const pick = pool
        .filter((c) => c.groups.has(target.g))
        .filter((c) => (adding ? c.sets < MAX_SETS : c.sets > MIN_SETS))
        .filter((c) => Math.abs((delta.get(`${c.dayIdx}:${c.exIdx}`) ?? 0) + sign) <= MAX_DELTA_PER_EXERCISE)
        .filter((c) =>
          [...c.groups].every((g) =>
            g === target.g
              ? true
              : adding
                ? totals[g] + 1 <= bands.bands[g].max
                : totals[g] - 1 >= bands.bands[g].min,
          ),
        )
        .sort((a, b) => a.groups.size - b.groups.size || (adding ? a.sets - b.sets : b.sets - a.sets))[0];
      if (!pick) continue;

      const ex = out.days[pick.dayIdx].exercises[pick.exIdx];
      ex.sets = (ex.sets ?? 0) + sign;
      const key = `${pick.dayIdx}:${pick.exIdx}`;
      delta.set(key, (delta.get(key) ?? 0) + sign);
      changes.push(
        `${target.g} ${adding ? "+1" : "−1"} set: ${ex.englishName ?? ex.name} (day ${out.days[pick.dayIdx].dayOfWeek})`,
      );
      applied = true;
      break;
    }
    if (!applied) break;
  }

  return { plan: out, changes };
}
