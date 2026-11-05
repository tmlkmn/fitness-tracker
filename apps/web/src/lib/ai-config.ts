/**
 * Central AI configuration: token budgets, timeouts, sort offsets, and
 * cache TTLs. Tuning any of these in production is a single-file change.
 */

/**
 * output_config.effort for the three plan-generation flows (weekly plan, daily
 * meals, daily workout). "high" is Sonnet 5.5's default, set explicitly so this
 * stays the single knob to tune; setting it also routes the call through a
 * stream (see sendMessage in ai-runtime), which the 32k budgets below need.
 * Sonnet 5.5's docs reserve "xhigh" for long agentic work — raise it only if an
 * eval shows these plans improve. Every other AI call sends no effort.
 * Smart model only: Haiku 4.5 rejects effort.
 */
export const AI_EFFORT = {
  weekly: "high",
  dailyMeal: "high",
  workoutReplace: "high",
} as const;

/**
 * max_tokens caps thinking + reply together. Sonnet 5.5 thinks by default, so
 * the plan flows need room on top of their 5-8k of JSON (a 5k budget got eaten
 * by thinking → truncated JSON → timeouts). 32k is roughly what Sonnet emits
 * inside a 300s call timeout — a higher cap would trade truncation for timeouts.
 */
export const AI_MAX_TOKENS = {
  dailyMeal: 32_000,
  workoutReplace: 32_000,
  workoutSection: 3000,
  workoutVariation: 1500,
  weeklyNutrition: 32_000,
  weeklyWorkout: 32_000,
} as const;

export const AI_TIMEOUTS = {
  weeklyCall: 300_000,
  weeklyRetry: 180_000,
  /**
   * Wall-clock budget for one whole weekly generation (both legs + retries).
   * Every call is capped by what's left of it, so the run ends inside the
   * route's 800s maxDuration — with ~80s spare for context loading and saving —
   * instead of being killed mid-call by the platform.
   */
  weeklyBudget: 720_000,
  /** Don't start a weekly call or retry with less budget than this left. */
  weeklyMinCallWindow: 90_000,
  /** Initial-call timeouts of the daily plan flows (retries: see below). */
  dailyMealCall: 300_000,
  workoutReplaceCall: 300_000,
} as const;

/**
 * Per-feature retry timeout, so a stuck retry doesn't tie up the request. The
 * plan flows get 200s: initial 300s + parse-fail retry 200s + quality retry
 * 200s = 700s, inside the 800s maxDuration of the pages hosting those actions.
 */
export const AI_RETRY_TIMEOUT_MS = {
  dailyMeal: 200_000,
  workoutReplace: 200_000,
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
