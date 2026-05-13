/**
 * Shared macro-drift tolerance constants and helpers used by both the daily
 * and weekly AI validators. Single source of truth so daily and weekly drift
 * thresholds stay in sync.
 */

/** Kcal tolerance for daily totals and weekly per-day-type / weekly-average checks. */
export const KCAL_TOLERANCE = 0.10;
/** Protein/carbs/fat tolerance for the same scopes. */
export const MACRO_TOLERANCE = 0.15;

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroTargets {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export type MacroKey = keyof MacroTotals;

export interface MacroDriftRatios {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

/**
 * Compute |actual − target| / target for each macro that has a target. Adds a
 * warning line per drift breach using the supplied `context` prefix and
 * returns the per-key ratios that exceeded tolerance.
 */
export function computeMacroDrift(
  actual: MacroTotals,
  target: MacroTargets | undefined,
  context: string,
  warnings: string[],
): MacroDriftRatios {
  if (!target) return {};
  const drift: MacroDriftRatios = {};
  const checks: { key: MacroKey; tol: number }[] = [
    { key: "calories", tol: KCAL_TOLERANCE },
    { key: "protein", tol: MACRO_TOLERANCE },
    { key: "carbs", tol: MACRO_TOLERANCE },
    { key: "fat", tol: MACRO_TOLERANCE },
  ];
  for (const { key, tol } of checks) {
    const tgt = target[key];
    if (tgt == null || tgt === 0) continue;
    const a = actual[key] ?? 0;
    const ratio = Math.abs(a - tgt) / tgt;
    if (ratio > tol) {
      drift[key] = ratio;
      warnings.push(
        `${context} ${key} ${Math.round(a)} drifts ${(ratio * 100).toFixed(0)}% from target ${tgt} (tolerance ±${tol * 100}%)`,
      );
    }
  }
  return drift;
}
