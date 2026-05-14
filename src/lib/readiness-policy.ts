/**
 * Pure readiness-score policy.
 *
 * Computes a 0..100 daily readiness score from passive signals (sleep,
 * water, yesterday's compliance, rest day bonus, recent trend) plus
 * optional subjective input (energy 1-5, pain 1-5). The actual DB
 * wrapper lives in `src/actions/readiness.ts`.
 *
 * Total = Sleep (35) + Compliance (15) + Water (10) + RestBonus (10)
 *       + Subjective (30) [+ trendPenalty -5 .. 0]
 * If subjective is missing, the passive max (70) is normalized to 100.
 */

export type ReadinessBand = "low" | "moderate" | "good" | "excellent";

export interface ReadinessInput {
  /** Last sleep log within the past 24h, or null. */
  sleep24h: {
    durationMinutes: number | null;
    quality: number | null;
  } | null;
  /** Yesterday's water log, or null. */
  waterYesterday: {
    glasses: number;
    targetGlasses: number;
  } | null;
  /** Yesterday's meal+exercise compliance. */
  complianceYesterday: {
    ratio: number | null;
    wasRest: boolean;
    hadPlan: boolean;
  };
  /** Today's subjective row, or null if not entered. */
  subjective: {
    energyRating: number | null;
    painScore: number | null;
  } | null;
  /** Passive-only score trend (current 7d avg vs prior 7d avg). */
  trend7d: {
    current: number | null;
    previous: number | null;
  };
}

export interface ReadinessBreakdown {
  sleep: number;
  compliance: number;
  water: number;
  restBonus: number;
  subjective: number;
  trendPenalty: number;
}

export interface ReadinessResult {
  /** Final 0..100 score. */
  score: number;
  band: ReadinessBand;
  breakdown: ReadinessBreakdown;
  /** True when subjective ratings contributed to the score. */
  hasSubjective: boolean;
  /** i18n key into messages.readiness.recommendation.* */
  recommendationKey: "low" | "moderate" | "good" | "excellent";
}

// ── Component weights (must sum to 100 when subjective present) ──
const W_SLEEP = 35;
const W_COMPLIANCE = 15;
const W_WATER = 10;
const W_REST_BONUS = 10;
const W_SUBJECTIVE = 30;
const PASSIVE_MAX = W_SLEEP + W_COMPLIANCE + W_WATER + W_REST_BONUS; // 70
const TREND_PENALTY = -5;

// ── Public thresholds used by deload-policy + UI banding ──
export const READINESS_AVG_FLOOR = 50;
export const READINESS_MIN_SAMPLES = 4;

function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function scoreSleep(
  sleep: ReadinessInput["sleep24h"],
): number {
  // No log → neutral baseline so missing data doesn't tank the score.
  if (!sleep) return W_SLEEP * 0.43; // 15 / 35
  const durationMinutes = sleep.durationMinutes;
  let durationPoints: number;
  if (durationMinutes == null) {
    durationPoints = W_SLEEP * 0.43;
  } else if (durationMinutes < 300) {
    durationPoints = 0;
  } else if (durationMinutes < 360) {
    durationPoints = 10;
  } else if (durationMinutes < 420) {
    durationPoints = 18;
  } else if (durationMinutes < 480) {
    durationPoints = 28;
  } else if (durationMinutes < 540) {
    durationPoints = W_SLEEP;
  } else {
    // 9h+ — slight overshoot penalty.
    durationPoints = 32;
  }
  // Quality (1..5): 5 = neutral, 1 = -10 penalty.
  let qualityAdj = 0;
  if (sleep.quality != null) {
    qualityAdj = (sleep.quality - 5) * 2.5; // 5→0, 4→-2.5, 3→-5, 2→-7.5, 1→-10
  }
  return clamp(durationPoints + qualityAdj, 0, W_SLEEP);
}

function scoreCompliance(
  compliance: ReadinessInput["complianceYesterday"],
): number {
  // Rest day yesterday → compliance dimension carries no penalty; user
  // already gets the rest bonus via RestBonus component.
  if (compliance.wasRest) return W_COMPLIANCE * 0.5; // 7.5 neutral
  if (!compliance.hadPlan) return W_COMPLIANCE * 0.5;
  const r = compliance.ratio;
  if (r == null) return W_COMPLIANCE * 0.5;
  if (r >= 1.0) return W_COMPLIANCE; // 15
  if (r >= 0.8) return 13;
  if (r >= 0.6) return 10;
  if (r >= 0.3) return 5;
  return 0;
}

function scoreWater(
  water: ReadinessInput["waterYesterday"],
): number {
  if (!water) return W_WATER * 0.5;
  if (water.targetGlasses <= 0) return W_WATER * 0.5;
  const r = water.glasses / water.targetGlasses;
  if (r >= 1.0) return W_WATER;
  if (r >= 0.8) return 8;
  if (r >= 0.6) return 5;
  return 2;
}

function scoreRestBonus(
  compliance: ReadinessInput["complianceYesterday"],
): number {
  return compliance.wasRest ? W_REST_BONUS : 0;
}

function scoreSubjective(
  subjective: ReadinessInput["subjective"],
): { points: number; hasSubjective: boolean } {
  if (!subjective) return { points: 0, hasSubjective: false };
  const hasEnergy = subjective.energyRating != null;
  const hasPain = subjective.painScore != null;
  if (!hasEnergy && !hasPain) return { points: 0, hasSubjective: false };

  // Energy 1..5 → 0..18 points.
  const energyPts = hasEnergy
    ? ((subjective.energyRating! - 1) / 4) * 18
    : 9; // neutral when only pain entered
  // Pain 1..5 (1=none, 5=severe) → 0..12 points (inverted).
  const painPts = hasPain
    ? ((5 - subjective.painScore!) / 4) * 12
    : 6;

  return {
    points: clamp(energyPts + painPts, 0, W_SUBJECTIVE),
    hasSubjective: true,
  };
}

function scoreTrendPenalty(trend: ReadinessInput["trend7d"]): number {
  if (trend.current == null || trend.previous == null) return 0;
  return trend.current < trend.previous ? TREND_PENALTY : 0;
}

function bandOf(score: number): ReadinessBand {
  if (score < 40) return "low";
  if (score < 65) return "moderate";
  if (score < 85) return "good";
  return "excellent";
}

export function computeReadinessScore(
  input: ReadinessInput,
): ReadinessResult {
  const sleep = scoreSleep(input.sleep24h);
  const compliance = scoreCompliance(input.complianceYesterday);
  const water = scoreWater(input.waterYesterday);
  const restBonus = scoreRestBonus(input.complianceYesterday);
  const { points: subjective, hasSubjective } = scoreSubjective(
    input.subjective,
  );
  const trendPenalty = scoreTrendPenalty(input.trend7d);

  const passive = sleep + compliance + water + restBonus;
  let raw: number;
  if (hasSubjective) {
    raw = passive + subjective + trendPenalty;
  } else {
    // Normalize passive (max 70) to 0..100 scale, then apply trend penalty.
    raw = (passive / PASSIVE_MAX) * 100 + trendPenalty;
  }

  const score = Math.round(clamp(raw, 0, 100));
  const band = bandOf(score);

  return {
    score,
    band,
    breakdown: {
      sleep,
      compliance,
      water,
      restBonus,
      subjective,
      trendPenalty,
    },
    hasSubjective,
    recommendationKey: band,
  };
}

/**
 * Tailwind background class for the score band. Mirrors macro-targets
 * progress-bar conventions (red/amber/emerald/primary).
 */
export function readinessBandColor(band: ReadinessBand): string {
  switch (band) {
    case "low":
      return "bg-destructive";
    case "moderate":
      return "bg-amber-500";
    case "good":
      return "bg-emerald-500";
    case "excellent":
      return "bg-primary";
  }
}
