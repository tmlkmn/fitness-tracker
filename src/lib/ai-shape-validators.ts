/**
 * Shared shape validators used by both weekly and daily AI response paths.
 *
 * Each helper coerces invalid AI output to a safe canonical value AND emits a
 * warning string for the caller to log/track. Callers decide whether to
 * trigger a content-retry based on accumulated warnings.
 */

// ─── Allowed-value enums ────────────────────────────────────────────────────

export const ALLOWED_MEAL_LABELS = new Set([
  "Kahvaltı",
  "Öğle Yemeği",
  "Akşam Yemeği",
  "Ara Öğün",
  "Erken Protein",
  "Pre-Workout",
  "Post-Workout",
  "Akşam Atıştırması",
]);
export const FALLBACK_MEAL_LABEL = "Ara Öğün";

export const ALLOWED_PLAN_TYPES = new Set(["workout", "swimming", "rest", "nutrition"]);
export const FALLBACK_PLAN_TYPE = "rest";

export const ALLOWED_SECTIONS = new Set(["warmup", "main", "cooldown", "sauna", "swimming"]);
export const FALLBACK_SECTION = "main";

// ─── Numeric bounds (per single meal / exercise) ───────────────────────────

export const MEAL_CALORIE_MIN_EXCLUSIVE = 0;
export const MEAL_CALORIE_MAX_EXCLUSIVE = 2500;
export const MEAL_PROTEIN_MIN = 0;
export const MEAL_PROTEIN_MAX = 150;

export const EXERCISE_REST_SECONDS_MIN = 30;
export const EXERCISE_REST_SECONDS_MAX = 300;
export const EXERCISE_DURATION_MIN_MIN = 1;
export const EXERCISE_DURATION_MAX_MIN = 90;

// Macro consistency: reported kcal vs P*4+C*4+F*9. 15% slack covers fiber,
// alcohol, rounding, and chef's-prerogative wiggle.
export const MACRO_CONSISTENCY_TOLERANCE = 0.15;

// ─── Helpers ────────────────────────────────────────────────────────────────

export function safeParseFloat(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** Coerces unknown AI-output to string with fallback; null/undefined → fallback. */
export function safeString(raw: unknown, fallback: string = ""): string {
  if (raw == null) return fallback;
  return typeof raw === "string" ? raw : String(raw);
}

/** Coerces unknown AI-output to number; null/undefined/non-numeric → null. */
export function safeNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Like `safeNumber` but rounds to an integer. */
export function safeInteger(raw: unknown): number | null {
  const n = safeNumber(raw);
  return n == null ? null : Math.round(n);
}

/**
 * Coerces unknown AI-output to a non-empty trimmed string, or null when
 * the value is missing or whitespace-only. Use for optional text fields
 * (englishName, notes, reps) where empty should become null.
 */
export function safeNullableText(raw: unknown): string | null {
  if (raw == null) return null;
  const s = typeof raw === "string" ? raw : String(raw);
  const trimmed = s.trim();
  return trimmed === "" ? null : s;
}

export function sanitizeMealLabel(
  raw: unknown,
  ctx: string,
  warnings: string[],
): string {
  const value = String(raw ?? "").trim();
  if (ALLOWED_MEAL_LABELS.has(value)) return value;
  warnings.push(
    `${ctx}: invalid mealLabel "${value || "<empty>"}" → coerced to "${FALLBACK_MEAL_LABEL}"`,
  );
  return FALLBACK_MEAL_LABEL;
}

export function sanitizePlanType(
  raw: unknown,
  ctx: string,
  warnings: string[],
): string {
  const value = String(raw ?? "").trim();
  if (ALLOWED_PLAN_TYPES.has(value)) return value;
  warnings.push(
    `${ctx}: invalid planType "${value || "<empty>"}" → coerced to "${FALLBACK_PLAN_TYPE}"`,
  );
  return FALLBACK_PLAN_TYPE;
}

export function sanitizeSection(
  raw: unknown,
  ctx: string,
  warnings: string[],
): string {
  const value = String(raw ?? "").trim();
  if (ALLOWED_SECTIONS.has(value)) return value;
  warnings.push(
    `${ctx}: invalid section "${value || "<empty>"}" → coerced to "${FALLBACK_SECTION}"`,
  );
  return FALLBACK_SECTION;
}

export function sanitizeCalories(
  raw: unknown,
  ctx: string,
  warnings: string[],
): number | null {
  if (raw == null) return null;
  const n = safeParseFloat(raw);
  if (n == null) {
    warnings.push(`${ctx}: non-numeric calories "${raw}" → null`);
    return null;
  }
  if (n <= MEAL_CALORIE_MIN_EXCLUSIVE || n >= MEAL_CALORIE_MAX_EXCLUSIVE) {
    warnings.push(
      `${ctx}: calories ${n} out of bounds (0, ${MEAL_CALORIE_MAX_EXCLUSIVE}) → null`,
    );
    return null;
  }
  return Math.round(n);
}

export type MacroKind = "protein" | "carbs" | "fat";

/**
 * Unified macro-gram sanitizer. Only protein has bounds + numeric coercion;
 * carbs/fat preserve passthrough behavior (raw → String(raw)) so existing
 * `reconcileMacros` drift detection sees the same input it always has.
 */
export function sanitizeMacroGram(
  kind: MacroKind,
  raw: unknown,
  ctx: string,
  warnings: string[],
): string | null {
  if (raw == null) return null;
  if (kind !== "protein") return String(raw);
  const n = safeParseFloat(raw);
  if (n == null) {
    warnings.push(`${ctx}: non-numeric proteinG "${raw}" → null`);
    return null;
  }
  if (n < MEAL_PROTEIN_MIN || n > MEAL_PROTEIN_MAX) {
    warnings.push(
      `${ctx}: proteinG ${n} out of bounds [${MEAL_PROTEIN_MIN}, ${MEAL_PROTEIN_MAX}] → null`,
    );
    return null;
  }
  return String(n);
}

export function sanitizeRestSeconds(
  raw: unknown,
  ctx: string,
  warnings: string[],
): number | null {
  if (raw == null) return null;
  const n = safeParseFloat(raw);
  if (n == null) {
    warnings.push(`${ctx}: non-numeric restSeconds "${raw}" → null`);
    return null;
  }
  if (n < EXERCISE_REST_SECONDS_MIN || n > EXERCISE_REST_SECONDS_MAX) {
    warnings.push(
      `${ctx}: restSeconds ${n} out of bounds [${EXERCISE_REST_SECONDS_MIN}, ${EXERCISE_REST_SECONDS_MAX}] → clamped`,
    );
    return Math.max(
      EXERCISE_REST_SECONDS_MIN,
      Math.min(EXERCISE_REST_SECONDS_MAX, Math.round(n)),
    );
  }
  return Math.round(n);
}

export function sanitizeDurationMinutes(
  raw: unknown,
  ctx: string,
  warnings: string[],
): number | null {
  if (raw == null) return null;
  const n = safeParseFloat(raw);
  if (n == null) {
    warnings.push(`${ctx}: non-numeric durationMinutes "${raw}" → null`);
    return null;
  }
  if (n < EXERCISE_DURATION_MIN_MIN || n > EXERCISE_DURATION_MAX_MIN) {
    warnings.push(
      `${ctx}: durationMinutes ${n} out of bounds [${EXERCISE_DURATION_MIN_MIN}, ${EXERCISE_DURATION_MAX_MIN}] → clamped`,
    );
    return Math.max(
      EXERCISE_DURATION_MIN_MIN,
      Math.min(EXERCISE_DURATION_MAX_MIN, Math.round(n)),
    );
  }
  return Math.round(n);
}

// ─── Macro consistency reconciliation ──────────────────────────────────────

export interface MacroBundle {
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

/**
 * Detects when reported kcal and (P*4+C*4+F*9) drift past tolerance. Returns
 * the reconciled calories (recomputed when strict mode is on, original
 * otherwise) and emits a warning when drift detected regardless of strict.
 */
export function reconcileMacros<T extends MacroBundle>(
  meal: T,
  ctx: string,
  warnings: string[],
  strict: boolean,
): T {
  const cal = meal.calories;
  const protein = safeParseFloat(meal.proteinG);
  const carbs = safeParseFloat(meal.carbsG);
  const fat = safeParseFloat(meal.fatG);

  if (cal == null || protein == null || carbs == null || fat == null) return meal;

  const computed = protein * 4 + carbs * 4 + fat * 9;
  if (computed <= 0) return meal;
  const ratio = cal / computed;
  const drift = Math.abs(ratio - 1);
  if (drift <= MACRO_CONSISTENCY_TOLERANCE) return meal;

  warnings.push(
    `${ctx}: macro/kcal mismatch — reported ${cal} kcal vs computed ${Math.round(computed)} kcal (drift ${(drift * 100).toFixed(0)}%)`,
  );

  if (!strict) return meal;
  return { ...meal, calories: Math.round(computed) };
}

export function isStrictMacroValidationEnabled(): boolean {
  return process.env.STRICT_MACRO_VALIDATION === "true";
}
