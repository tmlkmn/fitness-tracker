/**
 * Resolves the "underlying training day map" for a weekly generation request.
 * Distinct from `expectedDayModes` (the AI output schema's planType per day):
 * nutrition-only refreshes force every output day to "nutrition" because the
 * AI is only producing meals — but downstream consumers (carb cycling,
 * meal-timing pre/post-workout slots, training context block) still need to
 * know which days of the week the user actually trains on.
 *
 * Priority chain:
 *   1. User-supplied dayModes from the modal — explicit override.
 *   2. Existing weekly plan for this Monday — preserve the training shape so
 *      a nutrition refresh doesn't silently re-flatten workout days to rest.
 *   3. Fitness-level default — first-time or fresh weeks.
 */
import type { DayModeChoice } from "@/lib/ai-weekly-types";
import { defaultDayModesForLevel } from "@/lib/day-modes-default";

export type TrainingDayMode = "workout" | "swimming" | "rest";

/** Drop "nutrition" entries — they are not a training day type by themselves. */
function coerceTrainingMode(value: DayModeChoice | string | null | undefined): TrainingDayMode | null {
  if (value === "workout" || value === "swimming" || value === "rest") return value;
  return null;
}

export interface ResolveUnderlyingDayModesInput {
  userDayModes?: Partial<Record<number, DayModeChoice>> | undefined;
  existingDailyPlans?: Array<{ dayOfWeek: number | null; planType: string | null }> | undefined;
  fitnessLevel?: string | null;
}

export function resolveUnderlyingTrainingDayModes(
  input: ResolveUnderlyingDayModesInput,
): Record<number, TrainingDayMode> {
  const out: Record<number, TrainingDayMode> = {
    0: "rest", 1: "rest", 2: "rest", 3: "rest", 4: "rest", 5: "rest", 6: "rest",
  };

  // Priority 3 (lowest) — fitness-level default as the base.
  const base = defaultDayModesForLevel(input.fitnessLevel);
  for (let i = 0; i < 7; i++) {
    const m = coerceTrainingMode(base[i]);
    if (m) out[i] = m;
  }

  // Priority 2 — existing weekly plan rows override the default.
  if (input.existingDailyPlans) {
    for (const row of input.existingDailyPlans) {
      if (row.dayOfWeek == null || row.dayOfWeek < 0 || row.dayOfWeek > 6) continue;
      const m = coerceTrainingMode(row.planType);
      if (m) out[row.dayOfWeek] = m;
    }
  }

  // Priority 1 (highest) — explicit user selection from the modal.
  if (input.userDayModes) {
    for (let i = 0; i < 7; i++) {
      const m = coerceTrainingMode(input.userDayModes[i]);
      if (m) out[i] = m;
    }
  }

  return out;
}

/** Convenience predicate for callers deciding whether to render training context. */
export function hasAnyTrainingDay(modes: Record<number, TrainingDayMode>): boolean {
  for (let i = 0; i < 7; i++) {
    if (modes[i] === "workout" || modes[i] === "swimming") return true;
  }
  return false;
}
