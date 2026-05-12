/**
 * Central AI configuration: token budgets, timeouts, sort offsets, and
 * cache TTLs. Tuning any of these in production is a single-file change.
 */

export const AI_MAX_TOKENS = {
  dailyMeal: 5000,
  workoutReplace: 5000,
  workoutSection: 3000,
  workoutVariation: 1500,
  weeklyNutrition: 6000,
  weeklyWorkout: 8000,
} as const;

export const AI_TIMEOUTS = {
  weeklyCall: 240_000,
  weeklyRetry: 180_000,
} as const;

/**
 * Per-feature retry timeout. Initial calls use SDK default; retries cap the
 * abort window so a stuck retry doesn't tie up the request for ~10 minutes.
 */
export const AI_RETRY_TIMEOUT_MS = {
  dailyMeal: 60_000,
  workoutReplace: 60_000,
  workoutSection: 45_000,
  workoutVariation: 30_000,
} as const;

/** Days before cached exercise alternatives are considered stale. */
export const EXERCISE_ALTERNATIVES_TTL_DAYS = 30;

/** Section order — drives `sortOrder` field in exercises table. */
export const SECTION_SORT_ORDER = ["warmup", "main", "cooldown", "sauna", "swimming"] as const;
export const SECTION_SORT_OFFSET = 100;

/**
 * Returns the sort offset for an exercise section. Unknown sections fall
 * after the known set so they don't collide with predictable ordering.
 */
export function getSectionSortOffset(section: string): number {
  const idx = (SECTION_SORT_ORDER as readonly string[]).indexOf(section);
  return (idx >= 0 ? idx : SECTION_SORT_ORDER.length) * SECTION_SORT_OFFSET;
}
