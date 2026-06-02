import { db } from "@/db";
import { progressLogs } from "@/db/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import {
  deriveGoalFallback,
  isFitnessGoal,
  type FitnessGoal,
} from "@/lib/meal-timing";
import { GOAL_STRATEGIES, computeCalorieDelta, CALORIE_DELTA_CLAMP } from "@/lib/strategy/goal-strategy";
import { DELOAD_CALORIE_DELTA_MULTIPLIER } from "@/lib/deload-policy";
import {
  applyCarbCycling,
  applyCarbCyclingSingleDay,
  getCarbCyclingProfile,
  type DayType,
  type WeeklyMacroTargets,
} from "@/lib/carb-cycling";

export interface ResolveTargetsOptions {
  /** Apply deload multiplier to the calorie delta. */
  deloadWeek?: boolean;
  /**
   * Per-user nudge layered over the goal strategy (AI macro calculator /
   * manual card). Any field left null/undefined falls back to the goal
   * default. The arithmetic still runs in `computeDefaultTargets`, so the
   * result is always internally reconciled.
   */
  strategy?: StrategyOverride;
}

export interface StrategyOverride {
  /** Explicit kcal surplus/deficit; replaces the goal's per-kg delta. */
  calorieDelta?: number | null;
  /** Protein g per kg BODY WEIGHT; replaces the goal default. */
  proteinPerKgBW?: number | null;
  /** Fat as a fraction of total calories (0.20–0.35); replaces the default. */
  fatPctOfCalories?: number | null;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type Gender = "male" | "female" | "prefer_not_to_say";
export type DailyActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active";

export interface UserBasics {
  weight?: string | number | null;
  height?: number | null;
  age?: number | null;
  gender?: string | null;
  dailyActivityLevel?: string | null;
  fitnessGoal?: string | null;
  targetWeight?: string | number | null;
  serviceType?: string | null;
}

export interface UserWithTargets extends UserBasics {
  // Legacy raw-macro override columns — no longer read by the compute path.
  targetCalories?: number | null;
  targetProteinG?: string | null;
  targetCarbsG?: string | null;
  targetFatG?: string | null;
  // Strategy-nudge columns (Round 3) — drive the live dynamic target.
  targetCalorieDelta?: number | null;
  targetProteinPerKg?: string | null;
  targetFatPct?: string | null;
}

// Mifflin-St Jeor sex-aware constant. prefer_not_to_say uses the midpoint
// (-78) so users who decline still get a non-zero estimate.
const BMR_SEX_CONSTANT: Record<Gender, number> = {
  male: 5,
  female: -161,
  prefer_not_to_say: -78,
};

// TDEE multiplier from user.dailyActivityLevel (NOT fitnessLevel — fitness
// level is workout experience, daily activity is non-exercise movement).
const ACTIVITY_MULTIPLIER: Record<DailyActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};
const DEFAULT_ACTIVITY: DailyActivityLevel = "moderate";

const MIN_DAILY_CALORIES = 1200;

function safeParseFloat(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGender(g: string | null | undefined): Gender {
  if (g === "male" || g === "female") return g;
  return "prefer_not_to_say";
}

function normalizeActivity(level: string | null | undefined): DailyActivityLevel {
  if (
    level === "sedentary" ||
    level === "light" ||
    level === "moderate" ||
    level === "very_active"
  ) {
    return level;
  }
  return DEFAULT_ACTIVITY;
}

function resolveGoal(user: UserBasics): FitnessGoal {
  if (isFitnessGoal(user.fitnessGoal)) return user.fitnessGoal;
  const w = safeParseFloat(user.weight);
  const tw = safeParseFloat(user.targetWeight);
  return deriveGoalFallback(w, tw, user.serviceType ?? null);
}


// How many recent weight logs to average. Smooths day-to-day BIA-scale noise
// while still tracking the user's current weight (the BMR driver). One log →
// that log; zero → fall back to the static `users.weight`.
const TRAILING_WEIGHT_SAMPLE = 3;

/**
 * Average of the user's most recent weight logs — the LIVE weight the macro
 * engine uses, so targets track measurements without the user re-running
 * anything. `users.weight` (onboarding/profile value) is only the fallback
 * when no logs exist.
 */
async function fetchTrailingWeight(userId: string): Promise<number | null> {
  const rows = await db
    .select({ weight: progressLogs.weight })
    .from(progressLogs)
    .where(and(eq(progressLogs.userId, userId), isNotNull(progressLogs.weight)))
    .orderBy(desc(progressLogs.logDate))
    .limit(TRAILING_WEIGHT_SAMPLE);

  const weights = rows
    .map((r) => safeParseFloat(r.weight))
    .filter((w): w is number => w != null && w > 0);
  if (weights.length === 0) return null;
  return weights.reduce((a, b) => a + b, 0) / weights.length;
}

/** Clamps an explicit kcal delta to the same safety bounds as the per-kg path. */
function clampCalorieDelta(delta: number, multiplier = 1): number {
  const raw = Math.round(delta * multiplier);
  return Math.max(CALORIE_DELTA_CLAMP.min, Math.min(CALORIE_DELTA_CLAMP.max, raw));
}

export async function computeDefaultTargets(
  user: UserBasics,
  userId: string | null,
  opts?: ResolveTargetsOptions,
): Promise<MacroTargets | null> {
  // Live weight: average of recent logs (the BMR driver), falling back to the
  // static onboarding/profile value only when no logs exist. This is what
  // makes targets dynamic — logging a new weight moves them, no re-run needed.
  const loggedWeight = userId ? await fetchTrailingWeight(userId) : null;
  const w = loggedWeight ?? safeParseFloat(user.weight);
  const h = user.height ?? null;
  const age = user.age ?? null;
  if (!w || !h || !age) return null;

  const gender = normalizeGender(user.gender);
  const activity = ACTIVITY_MULTIPLIER[normalizeActivity(user.dailyActivityLevel)];
  const goal = resolveGoal(user);
  const strategy = GOAL_STRATEGIES[goal];
  const nudge = opts?.strategy;

  // Mifflin-St Jeor (sex-aware)
  const bmr = 10 * w + 6.25 * h - 5 * age + BMR_SEX_CONSTANT[gender];
  const tdee = bmr * activity;
  const deloadMultiplier = opts?.deloadWeek ? DELOAD_CALORIE_DELTA_MULTIPLIER : 1;
  // Calorie delta: an explicit nudge (AI/manual) replaces the goal's per-kg
  // delta; both share the ±800 clamp and the deload shrink.
  const delta = nudge?.calorieDelta != null
    ? clampCalorieDelta(nudge.calorieDelta, deloadMultiplier)
    : computeCalorieDelta(
        strategy,
        w,
        opts?.deloadWeek ? { deloadMultiplier: DELOAD_CALORIE_DELTA_MULTIPLIER } : undefined,
      );
  const calories = Math.max(MIN_DAILY_CALORIES, Math.round(tdee + delta));

  // Protein anchored to BODY WEIGHT (Round 4) — bodyweight-based, not LBM:
  // hit the protein target first, fat is a % of calories, carbs take the rest.
  const proteinPerKg = nudge?.proteinPerKgBW ?? strategy.proteinPerKgBW;
  const fatPct = nudge?.fatPctOfCalories ?? strategy.fatPctOfCalories;
  const protein = Math.round(w * proteinPerKg);
  const fat = Math.round((calories * fatPct) / 9);
  const carbsRaw = Math.round((calories - protein * 4 - fat * 9) / 4);
  const carbs = Math.max(strategy.minCarbsG[gender], carbsRaw);

  // minCarbsG bumpu veya rounding farkları makro toplamını calorie hedefinin
  // üzerine çıkarabilir (özellikle MIN_DAILY_CALORIES devreye girince).
  // Dönen calories değerini gerçek makro toplamına göre güncelle.
  const actualCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const finalCalories = Math.max(calories, actualCalories);

  return { calories: finalCalories, protein, carbs, fat };
}

/**
 * Reads the persisted strategy-nudge columns into a `StrategyOverride`.
 * Null columns fall back to the goal-strategy default downstream.
 */
export function readStrategyOverride(user: UserWithTargets): StrategyOverride {
  return {
    calorieDelta: user.targetCalorieDelta ?? null,
    proteinPerKgBW: safeParseFloat(user.targetProteinPerKg),
    fatPctOfCalories: safeParseFloat(user.targetFatPct),
  };
}

/**
 * Round 3: targets are computed LIVE — no raw-macro freeze. We layer the
 * user's persisted strategy nudge (or an explicit `opts.strategy`, e.g. the
 * AI calculator preview) over the goal strategy and let
 * `computeDefaultTargets` do the arithmetic, so the result always reconciles
 * (protein·4 + carbs·4 + fat·9 ≈ calories) and tracks the latest weight/goal.
 */
export async function resolveTargets(
  user: UserWithTargets,
  userId: string | null,
  opts?: ResolveTargetsOptions,
): Promise<MacroTargets | null> {
  const strategy = opts?.strategy ?? readStrategyOverride(user);
  return computeDefaultTargets(user, userId, { ...opts, strategy });
}

export function macroProgressColor(actual: number, target: number): string {
  if (target <= 0) return "bg-muted-foreground/40";
  const pct = (actual / target) * 100;
  if (pct < 90) return "bg-amber-500";
  if (pct <= 110) return "bg-primary";
  return "bg-destructive";
}

/**
 * Resolves baseline macro targets and distributes them across day types using
 * a goal-adaptive carb-cycling profile. Returns null when the user's profile
 * is too incomplete to compute targets.
 */
export async function resolveWeeklyTargets(
  user: UserWithTargets,
  userId: string | null,
  opts: ResolveTargetsOptions & {
    dayTypeCounts: Record<DayType, number>;
    /** Re-adaptation week: softens the swimming carb pump (light swim ≠ heavy session). */
    returnWeek?: boolean;
  },
): Promise<WeeklyMacroTargets | null> {
  const baseline = await resolveTargets(user, userId, { deloadWeek: opts.deloadWeek });
  if (!baseline) return null;
  const profile = getCarbCyclingProfile(
    isFitnessGoal(user.fitnessGoal) ? user.fitnessGoal : resolveGoal(user),
    opts.deloadWeek,
    opts.returnWeek,
  );
  const gender = normalizeGender(user.gender);
  const goal = isFitnessGoal(user.fitnessGoal) ? user.fitnessGoal : resolveGoal(user);
  const minCarbsFloor = GOAL_STRATEGIES[goal].minCarbsG[gender];
  return applyCarbCycling(baseline, opts.dayTypeCounts, profile, minCarbsFloor);
}

/**
 * Resolves macro targets for a single day, adjusting carbs per the cycling
 * profile and the given `planType`. Used by the daily meal flow.
 */
export async function resolveTargetsForDay(
  user: UserWithTargets,
  userId: string | null,
  planType: string | null | undefined,
  opts?: ResolveTargetsOptions,
): Promise<MacroTargets | null> {
  const baseline = await resolveTargets(user, userId, opts);
  if (!baseline) return null;
  const profile = getCarbCyclingProfile(
    isFitnessGoal(user.fitnessGoal) ? user.fitnessGoal : resolveGoal(user),
    opts?.deloadWeek,
  );
  if (!profile.enabled) return baseline;
  const gender = normalizeGender(user.gender);
  const goal = isFitnessGoal(user.fitnessGoal) ? user.fitnessGoal : resolveGoal(user);
  const minCarbsFloor = GOAL_STRATEGIES[goal].minCarbsG[gender];
  return applyCarbCyclingSingleDay(baseline, planType, profile, minCarbsFloor);
}
