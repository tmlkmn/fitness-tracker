/**
 * Pure validation for the "AI ile çeşitlendir" (meal variation) feature.
 *
 * The feature is a like-for-like swap: every suggestion must keep its
 * protein/carbs/fat (and kcal) close to the ORIGINAL meal — NOT the day's
 * remaining macro budget. These helpers are pure (no DB / no AI) so they're
 * unit-testable and live outside the "use server" action file.
 */
import type { Locale } from "@/lib/locale";

// Each suggestion's protein/carbs/fat (and kcal) must stay within this fraction
// of the ORIGINAL meal's value.
export const MEAL_VARIATION_MACRO_TOLERANCE = 0.15;

export interface OriginalMacros {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

/** Minimal suggestion shape the validator needs (content etc. are ignored). */
export interface SuggestionMacroShape {
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

export type MacroKey = "calories" | "protein" | "carbs" | "fat";

export function parseMacroNum(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Macros of a suggestion that drift beyond tolerance from the original meal. */
export function suggestionMacroDrift(
  s: SuggestionMacroShape,
  original: OriginalMacros,
): { key: MacroKey; pct: number }[] {
  const checks: { key: MacroKey; orig: number | null; sug: number | null }[] = [
    { key: "calories", orig: original.calories, sug: s.calories },
    { key: "protein", orig: original.protein, sug: parseMacroNum(s.proteinG) },
    { key: "carbs", orig: original.carbs, sug: parseMacroNum(s.carbsG) },
    { key: "fat", orig: original.fat, sug: parseMacroNum(s.fatG) },
  ];
  const drifts: { key: MacroKey; pct: number }[] = [];
  for (const c of checks) {
    // Skip macros the original meal doesn't carry — can't match an unknown.
    if (c.orig == null || c.orig <= 0 || c.sug == null) continue;
    const pct = Math.abs(c.sug - c.orig) / c.orig;
    if (pct > MEAL_VARIATION_MACRO_TOLERANCE) drifts.push({ key: c.key, pct });
  }
  return drifts;
}

/** Validates every suggestion against the ORIGINAL meal's macros (±tolerance each). */
export function validateAgainstOriginal(
  suggestions: SuggestionMacroShape[],
  original: OriginalMacros,
  locale: Locale,
): { warnings: string[]; offCount: number; totalDrift: number } {
  const hasOriginal = [original.calories, original.protein, original.carbs, original.fat].some(
    (v) => v != null && v > 0,
  );
  if (!hasOriginal) return { warnings: [], offCount: 0, totalDrift: 0 };

  const labelMap: Record<MacroKey, string> = locale === "en"
    ? { calories: "calories", protein: "protein", carbs: "carbs", fat: "fat" }
    : { calories: "kalori", protein: "protein", carbs: "karbonhidrat", fat: "yağ" };

  const warnings: string[] = [];
  let offCount = 0;
  let totalDrift = 0;
  suggestions.forEach((s, i) => {
    const drifts = suggestionMacroDrift(s, original);
    if (drifts.length === 0) return;
    offCount++;
    totalDrift += drifts.reduce((sum, d) => sum + d.pct, 0);
    const parts = drifts.map((d) => `${labelMap[d.key]} %${Math.round(d.pct * 100)}`);
    warnings.push(
      locale === "en"
        ? `[meal-macro-drift] Suggestion ${i + 1} drifts from the original meal: ${parts.join(", ")} (>15%)`
        : `[meal-macro-drift] Öneri ${i + 1} orijinal öğünden sapıyor: ${parts.join(", ")} (>%15)`,
    );
  });
  return { warnings, offCount, totalDrift };
}
