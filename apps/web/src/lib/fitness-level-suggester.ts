/**
 * Pure heuristic for "user's data suggests upgrading their declared fitness
 * level". UP-only by design — loss-aversion: we don't tell an "advanced"
 * user with a slumping completion rate to demote themselves. The server
 * action wraps this with DB queries; this file owns the thresholds.
 *
 * Thresholds are intentionally conservative: a nudge that fires for someone
 * who shouldn't actually graduate is worse than a missed nudge — the user
 * can still edit their level manually any time.
 */

export type FitnessLevel = "beginner" | "returning" | "intermediate" | "advanced";

export interface FitnessLevelMetrics {
  /** Weeks since the user's earliest weekly plan startDate. */
  historyWeeks: number;
  /** Mean isCompleted across exercises in the last 6 weeks. null when no data. */
  completionRate: number | null;
  /** Mean working sets per training week over the last 6 weeks. null when no data. */
  avgWeeklySets: number | null;
}

export interface FitnessLevelSuggestion {
  suggested: FitnessLevel;
  declared: FitnessLevel | null;
  /** i18n reason keys — UI maps to localized strings via interpolation. */
  reasons: FitnessLevelReason[];
  metrics: FitnessLevelMetrics;
  confidence: "medium" | "high";
}

export type FitnessLevelReason =
  | { kind: "history"; weeks: number }
  | { kind: "completion"; rate: number }
  | { kind: "volume"; sets: number };

// ─── Thresholds (single source) ─────────────────────────────────────────────

const MIN_HISTORY_WEEKS_FOR_SUGGESTION = 3;

// beginner → intermediate
const BEG_TO_INT_WEEKS = 6;
const BEG_TO_INT_COMPLETION = 0.6;
const BEG_TO_INT_STRONG_WEEKS = 12;
const BEG_TO_INT_STRONG_COMPLETION = 0.75;
const BEG_TO_INT_STRONG_SETS = 12;

// returning → intermediate (lower bar — they have prior training base)
const RET_TO_INT_WEEKS = 4;
const RET_TO_INT_COMPLETION = 0.6;

// intermediate → advanced
const INT_TO_ADV_WEEKS = 16;
const INT_TO_ADV_COMPLETION = 0.75;
const INT_TO_ADV_SETS = 18;

function isValidLevel(value: unknown): value is FitnessLevel {
  return (
    value === "beginner" ||
    value === "returning" ||
    value === "intermediate" ||
    value === "advanced"
  );
}

export function coerceFitnessLevel(value: string | null | undefined): FitnessLevel | null {
  if (value == null) return null;
  return isValidLevel(value) ? value : null;
}

/**
 * Pure heuristic — returns `null` when no UP suggestion is warranted:
 * - declared is null (settings missing → out of scope, handled by Tur 14)
 * - data insufficient (historyWeeks < threshold)
 * - declared === advanced (already at the top)
 * - signals don't meet the upgrade thresholds
 */
export function suggestFitnessLevel(input: {
  declared: FitnessLevel | null;
  metrics: FitnessLevelMetrics;
}): FitnessLevelSuggestion | null {
  const { declared, metrics } = input;
  if (declared == null) return null;
  if (declared === "advanced") return null;
  if (metrics.historyWeeks < MIN_HISTORY_WEEKS_FOR_SUGGESTION) return null;

  if (declared === "beginner") {
    return suggestBeginnerUpgrade(declared, metrics);
  }
  if (declared === "returning") {
    return suggestReturningUpgrade(declared, metrics);
  }
  return suggestIntermediateUpgrade(declared, metrics);
}

function suggestBeginnerUpgrade(
  declared: FitnessLevel,
  metrics: FitnessLevelMetrics,
): FitnessLevelSuggestion | null {
  const completion = metrics.completionRate ?? 0;

  // Strong signal: long history + high completion + meaningful volume.
  if (
    metrics.historyWeeks >= BEG_TO_INT_STRONG_WEEKS &&
    completion >= BEG_TO_INT_STRONG_COMPLETION &&
    (metrics.avgWeeklySets ?? 0) >= BEG_TO_INT_STRONG_SETS
  ) {
    return buildSuggestion(declared, "intermediate", metrics, "high", [
      { kind: "history", weeks: metrics.historyWeeks },
      { kind: "completion", rate: completion },
      { kind: "volume", sets: Math.round(metrics.avgWeeklySets ?? 0) },
    ]);
  }

  // Medium signal: enough weeks + reasonable completion.
  if (
    metrics.historyWeeks >= BEG_TO_INT_WEEKS &&
    completion >= BEG_TO_INT_COMPLETION
  ) {
    return buildSuggestion(declared, "intermediate", metrics, "medium", [
      { kind: "history", weeks: metrics.historyWeeks },
      { kind: "completion", rate: completion },
    ]);
  }

  return null;
}

function suggestReturningUpgrade(
  declared: FitnessLevel,
  metrics: FitnessLevelMetrics,
): FitnessLevelSuggestion | null {
  const completion = metrics.completionRate ?? 0;
  if (
    metrics.historyWeeks >= RET_TO_INT_WEEKS &&
    completion >= RET_TO_INT_COMPLETION
  ) {
    return buildSuggestion(declared, "intermediate", metrics, "medium", [
      { kind: "history", weeks: metrics.historyWeeks },
      { kind: "completion", rate: completion },
    ]);
  }
  return null;
}

function suggestIntermediateUpgrade(
  declared: FitnessLevel,
  metrics: FitnessLevelMetrics,
): FitnessLevelSuggestion | null {
  const completion = metrics.completionRate ?? 0;
  if (
    metrics.historyWeeks >= INT_TO_ADV_WEEKS &&
    completion >= INT_TO_ADV_COMPLETION &&
    (metrics.avgWeeklySets ?? 0) >= INT_TO_ADV_SETS
  ) {
    return buildSuggestion(declared, "advanced", metrics, "high", [
      { kind: "history", weeks: metrics.historyWeeks },
      { kind: "completion", rate: completion },
      { kind: "volume", sets: Math.round(metrics.avgWeeklySets ?? 0) },
    ]);
  }
  return null;
}

function buildSuggestion(
  declared: FitnessLevel,
  suggested: FitnessLevel,
  metrics: FitnessLevelMetrics,
  confidence: "medium" | "high",
  reasons: FitnessLevelReason[],
): FitnessLevelSuggestion {
  return { suggested, declared, reasons, metrics, confidence };
}
