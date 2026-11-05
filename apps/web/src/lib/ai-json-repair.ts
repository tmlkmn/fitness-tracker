/**
 * Shared JSON parsing + repair helpers for AI responses. AI models sometimes
 * emit markdown fences, trailing commas, single-quoted strings, or get cut
 * off at max_tokens with an incomplete object/array. These helpers recover
 * what's recoverable so partial responses still save something useful.
 */

export function parseAiJson(text: string): unknown {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Fix trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // Fix single-quoted strings → double-quoted (common AI drift)
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');
  cleaned = cleaned.replace(/'([^']*)'(?=\s*[:,\]}])/g, '"$1"');

  return JSON.parse(cleaned);
}

/**
 * Attempt to repair a truncated response by closing any open brackets/braces.
 * Drops the trailing incomplete token, then walks forward balancing { } [ ].
 */
export function repairTruncatedJson(text: string): string {
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Fix trailing commas
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");

  // Remove trailing incomplete key-value (e.g. `"key": "incom`)
  cleaned = cleaned.replace(/,?\s*"[^"]*"?\s*:\s*"?[^"]*$/, "");
  // Remove trailing incomplete object start (e.g. `, {`)
  cleaned = cleaned.replace(/,?\s*\{[^}]*$/, "");

  // Count open brackets and close them
  const opens: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of cleaned) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") opens.push(ch);
    if (ch === "}" || ch === "]") opens.pop();
  }

  // If we're inside a string, close it
  if (inString) cleaned += '"';

  // Close all open brackets in reverse order
  while (opens.length > 0) {
    const open = opens.pop()!;
    cleaned += open === "{" ? "}" : "]";
  }

  return cleaned;
}
