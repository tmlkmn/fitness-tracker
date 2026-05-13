/**
 * Compares a generated weekly workout plan against the user's previous week
 * to flag two classes of progression problems:
 *   - **No progression** — current weekly working volume is essentially the
 *     same (or lower) than last week's, despite the user being on a normal
 *     (non-deload) phase. Repeated stagnation is the #1 reason long-term
 *     trainees plateau.
 *   - **Aggressive progression** — current weekly volume jumped more than
 *     ~30 % over last week's. Beginners can sustain bigger jumps, but for an
 *     established trainee this is the fastest path to a tweaked joint or
 *     non-functional overreaching.
 *   - **Deload violation** — when the AI was asked to produce a deload week
 *     (req.deloadWeek), weekly working volume MUST drop by at least 30 %.
 *     If the model returns a "deload" labelled week that's actually as hard
 *     as the prior, the recovery purpose is defeated.
 *
 * The validator is intentionally a *soft warning* layer — issues are
 * surfaced via warnings + a single retry hint, never block the user from
 * applying a plan. Volume is the simplest, most stable signal available
 * from the existing schema; rep range or load tracking would belong here
 * later.
 */
import type { AIWeeklyPlan } from "@/lib/ai-weekly-types";

/** Sections counted as working volume. Warmup/cooldown are excluded. */
const WORKING_SECTIONS = new Set(["main", "swimming"]);

/** Threshold (fraction) — increase ≤ this counts as "no progression". */
export const NO_PROGRESSION_THRESHOLD = 0.0;
/** Threshold (fraction) — increase > this counts as "aggressive". */
export const AGGRESSIVE_PROGRESSION_THRESHOLD = 0.30;
/** Required minimum volume drop in a deload week (fraction). */
export const DELOAD_MIN_REDUCTION = 0.30;

/**
 * Sum every "set" across the plan's main/swimming sections. Exercises with
 * a null `sets` (typically durationMinutes-based moves like jogging) count
 * as 1 working unit so they aren't dropped from the comparison entirely.
 */
export function computeWorkingSets(plan: AIWeeklyPlan): number {
  let total = 0;
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      if (!WORKING_SECTIONS.has(ex.section)) continue;
      total += ex.sets ?? 1;
    }
  }
  return total;
}

export interface ProgressiveOverloadAssessment {
  /** True when no warning was emitted. */
  ok: boolean;
  /** Human-readable warning for the AI retry nudge / logs. Null if ok. */
  warning: string | null;
  /** Discriminator for telemetry. */
  kind: "no-progression" | "aggressive-progression" | "deload-violation" | null;
  /** Computed delta (currentSets - previousSets) / previousSets. */
  deltaRatio: number;
}

export interface AssessOverloadInput {
  currentSets: number;
  previousSets: number;
  isDeloadWeek: boolean;
}

export function assessProgressiveOverload(
  input: AssessOverloadInput,
): ProgressiveOverloadAssessment {
  const { currentSets, previousSets, isDeloadWeek } = input;
  // No previous data → no opinion. Beginners / first-week users never trip
  // these warnings.
  if (previousSets <= 0) {
    return { ok: true, warning: null, kind: null, deltaRatio: 0 };
  }
  const delta = (currentSets - previousSets) / previousSets;

  if (isDeloadWeek) {
    // Volume must drop by at least DELOAD_MIN_REDUCTION (e.g. -30 %).
    if (delta > -DELOAD_MIN_REDUCTION) {
      return {
        ok: false,
        kind: "deload-violation",
        deltaRatio: delta,
        warning:
          `Deload haftası işaretlendi ama haftalık çalışan set sayısı ` +
          `${previousSets} → ${currentSets} (${(delta * 100).toFixed(0)}%). ` +
          `Deload için en az %${Math.round(DELOAD_MIN_REDUCTION * 100)} hacim düşüşü gerek.`,
      };
    }
    return { ok: true, warning: null, kind: null, deltaRatio: delta };
  }

  if (delta <= NO_PROGRESSION_THRESHOLD) {
    return {
      ok: false,
      kind: "no-progression",
      deltaRatio: delta,
      warning:
        `Haftalık çalışan set sayısı önceki haftaya göre artmamış ` +
        `(${previousSets} → ${currentSets}, ${(delta * 100).toFixed(0)}%). ` +
        `Progresif yüklenme için set/tekrar/egzersiz çeşitliliğinden en az ` +
        `birini artır.`,
    };
  }
  if (delta > AGGRESSIVE_PROGRESSION_THRESHOLD) {
    return {
      ok: false,
      kind: "aggressive-progression",
      deltaRatio: delta,
      warning:
        `Haftalık hacim önceki haftadan %${(delta * 100).toFixed(0)} arttı ` +
        `(${previousSets} → ${currentSets}). %${Math.round(AGGRESSIVE_PROGRESSION_THRESHOLD * 100)}+ artış toparlanma riski. ` +
        `Daha kademeli artır.`,
    };
  }

  return { ok: true, warning: null, kind: null, deltaRatio: delta };
}
