/**
 * Allergen post-generation guard. AI prompts already list user's allergens
 * with a strong "DO NOT USE" instruction, but the model occasionally slips
 * — this helper scans generated meal content for substring matches against
 * the user's allergen list so callers can warn / trigger retry.
 *
 * False positives are accepted by design: "gluten-free roti" will trip on
 * "gluten". Hits are advisory (warning level), not hard-blocks; retry
 * mechanisms downstream decide whether to call again.
 */

const TURKISH_FOLD: Record<string, string> = {
  ş: "s", Ş: "s",
  ı: "i", İ: "i",
  ğ: "g", Ğ: "g",
  ü: "u", Ü: "u",
  ö: "o", Ö: "o",
  ç: "c", Ç: "c",
};

function fold(s: string): string {
  let out = "";
  for (const ch of s) {
    out += TURKISH_FOLD[ch] ?? ch;
  }
  return out.toLowerCase();
}

/**
 * Parses a user.foodAllergens raw string (either JSON array or comma-separated)
 * into a normalized list. Returns [] when the user reported no allergens
 * (empty string, null, or the sentinel "Yok").
 */
export function parseUserAllergens(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let list: string[];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      list = parsed.map((x) => String(x).trim()).filter(Boolean);
    } else {
      list = [String(parsed)];
    }
  } catch {
    list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  // Sentinel "Yok" = user explicitly said no allergies — treat as empty.
  if (list.length === 1 && list[0].toLowerCase() === "yok") return [];
  return list;
}

/**
 * Returns the subset of `allergens` that appear as substrings in `content`,
 * Turkish-fold + case-insensitive. Empty list when no hits.
 */
export function detectAllergens(content: string, allergens: string[]): string[] {
  if (!content || allergens.length === 0) return [];
  const haystack = fold(content);
  const hits: string[] = [];
  for (const a of allergens) {
    const needle = fold(a);
    if (needle.length === 0) continue;
    if (haystack.includes(needle)) hits.push(a);
  }
  return hits;
}
