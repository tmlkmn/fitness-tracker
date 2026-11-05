/**
 * Joins prompt-prefix parts and a user-supplied note into a single sentence
 * string. Empty/whitespace parts are dropped. Returns `undefined` when nothing
 * remains so callers can pass it directly to actions that treat
 * "no note" as `undefined`.
 */
export function buildAiUserNote(
  parts: Array<string | null | undefined>,
): string | undefined {
  const cleaned = parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p.length > 0);
  return cleaned.length > 0 ? cleaned.join(". ") : undefined;
}
