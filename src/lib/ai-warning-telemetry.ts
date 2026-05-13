/**
 * Categorize validator warning strings into a count map for telemetry.
 *
 * Warnings are surfaced two ways today: (1) the user sees them in the
 * suggestion modal or weekly preview, (2) admins want to see *how often
 * each category fires* across the user base to tune thresholds. The first
 * needs the original prose; the second needs a stable category key plus a
 * count.
 *
 * This helper does the second job. It recognizes the `[bracket-tag]`
 * prefixes the various validators emit, plus a couple of substring matches
 * for the validators that push prose without a tag (macro drift, allergen).
 * Unrecognized warnings land in the `uncategorized` bucket.
 */

const BRACKET_TAG_RE = /^\[([a-z0-9-]+)\]/i;

/** Substring → category fallback for prose warnings without a `[tag]` prefix. */
const KEYWORD_CATEGORIES: Array<{ keywords: string[]; category: string }> = [
  // Macro drift (per ai-weekly-types validateWeeklyPlan + ai-daily-validators).
  { keywords: ["kcal", "kalori", "calories"], category: "kcal-drift" },
  { keywords: ["protein"], category: "protein-drift" },
  { keywords: ["karbonhidrat", "carbs"], category: "carbs-drift" },
  { keywords: ["yağ", "fat"], category: "fat-drift" },
  // Allergen detection (validateWeeklyPlan + detectMealAllergenHits).
  { keywords: ["allergen", "alerjen"], category: "allergen-hits" },
  // Section/plan-type issues from validateWeeklyPlan.
  { keywords: ["missing section", "section eksik"], category: "missing-sections" },
  { keywords: ["planType", "plan tipi"], category: "plan-type-mismatch" },
  { keywords: ["rest day", "rest günü", "dinlenme"], category: "rest-day-violation" },
];

function categorizeWarning(warning: string): string {
  const trimmed = warning.trim();
  const m = BRACKET_TAG_RE.exec(trimmed);
  if (m) return m[1].toLowerCase();
  const lower = trimmed.toLowerCase();
  for (const { keywords, category } of KEYWORD_CATEGORIES) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "uncategorized";
}

/**
 * Reduce a flat warning array into `{ category: count }`. Returns an empty
 * object when the input is empty — caller can spread it into telemetry
 * metadata without a presence check.
 */
export function categorizeWarnings(
  warnings: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of warnings) {
    const key = categorizeWarning(w);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
