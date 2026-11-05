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

/**
 * Substring → category fallback for prose warnings without a `[tag]` prefix.
 * First match wins, so specific patterns come before the generic macro
 * keywords: "non-numeric calories", "macro/kcal mismatch" or an allergen hit
 * on "fıstık yağı" would otherwise be miscounted as macro drift.
 */
const KEYWORD_CATEGORIES: Array<{ keywords: string[]; category: string }> = [
  // Shape coercions from ai-shape-validators — the model sent a value outside
  // the allowed set or range and the validator replaced it.
  { keywords: ["invalid mealLabel", "invalid section"], category: "label-coerced" },
  { keywords: ["non-numeric", "out of bounds"], category: "shape-coerced" },
  // A meal whose own macros don't add up to its kcal — not a day-target miss.
  { keywords: ["macro/kcal mismatch"], category: "meal-macro-inconsistency" },
  // Allergen detection (validateWeeklyPlan + detectMealAllergenHits).
  { keywords: ["allergen", "alerjen"], category: "allergen-hits" },
  // Structural issues from validateWeeklyPlan.
  { keywords: ["missing from response", 'missing "days"'], category: "missing-days" },
  { keywords: ["no meals"], category: "empty-meals" },
  { keywords: ["missing section", "section eksik"], category: "missing-sections" },
  { keywords: ["planType", "plan tipi"], category: "plan-type-mismatch" },
  { keywords: ["rest day", "rest günü", "dinlenme"], category: "rest-day-violation" },
  // Macro drift (per ai-weekly-types validateWeeklyPlan + ai-daily-validators).
  { keywords: ["kcal", "kalori", "calories"], category: "kcal-drift" },
  { keywords: ["protein"], category: "protein-drift" },
  { keywords: ["karbonhidrat", "carbs"], category: "carbs-drift" },
  { keywords: ["yağ", "fat"], category: "fat-drift" },
];

function categorizeWarning(warning: string): string {
  const trimmed = warning.trim();
  const m = BRACKET_TAG_RE.exec(trimmed);
  if (m) return m[1].toLowerCase();
  const lower = trimmed.toLowerCase();
  for (const { keywords, category } of KEYWORD_CATEGORIES) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return category;
  }
  return "uncategorized";
}

/**
 * Tags of notes that record a deterministic fix the system already applied
 * (macro-engine portion scaling, reference overrides, set nudges). They are
 * telemetry only: counted in `warningCategories`, never shown to the user as
 * a warning and not a quality problem by themselves.
 */
const SYSTEM_NOTE_TAGS = new Set([
  "engine-scaled",
  "engine-fallback",
  "engine-ingredient-dropped",
  "ingredient-ref-override",
  "volume-adjusted",
]);

export function isSystemNote(warning: string): boolean {
  const m = BRACKET_TAG_RE.exec(warning.trim());
  return m != null && SYSTEM_NOTE_TAGS.has(m[1].toLowerCase());
}

/** The warnings worth showing the user — system notes removed. */
export function userFacingWarnings(warnings: readonly string[]): string[] {
  return warnings.filter((w) => !isSystemNote(w));
}

/** Raw warnings kept per usage-log row: enough for the admin pattern view. */
const WARNINGS_SAMPLE_LIMIT = 40;
const WARNING_MAX_CHARS = 160;

/**
 * Bounded copy of the raw warning prose for the `warnings` field that the
 * admin AI-warnings page classifies into patterns. Cap the array rather than
 * the serialized JSON — slicing the JSON string yields unparseable rows.
 */
export function sampleWarnings(warnings: readonly string[]): string[] {
  return warnings.slice(0, WARNINGS_SAMPLE_LIMIT).map((w) => w.slice(0, WARNING_MAX_CHARS));
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
