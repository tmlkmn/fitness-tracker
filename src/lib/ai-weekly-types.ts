export interface AIMealItem {
  mealTime: string;
  mealLabel: string;
  content: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
}

export interface AIExerciseItem {
  section: string;
  sectionLabel: string;
  name: string;
  englishName: string | null;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  durationMinutes: number | null;
  notes: string | null;
}

export interface AIWeeklyDay {
  dayOfWeek: number;
  dayName: string;
  planType: string;
  workoutTitle: string | null;
  meals: AIMealItem[];
  exercises: AIExerciseItem[];
}

export interface AIWeeklyPlan {
  weekTitle: string;
  phase: string;
  notes: string | null;
  days: AIWeeklyDay[];
}

export interface ValidateWeeklyPlanResult {
  plan: AIWeeklyPlan;
  warnings: string[];
}

export interface ExpectedTargets {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface ValidateWeeklyPlanOptions {
  /** Override env-based STRICT_MACRO_VALIDATION flag. */
  strictMacroValidation?: boolean;
}

// ─── Allowed-value enums (vocabulary the AI must stay within) ──────────────

const ALLOWED_MEAL_LABELS = new Set([
  "Kahvaltı",
  "Öğle Yemeği",
  "Akşam Yemeği",
  "Ara Öğün",
  "Erken Protein",
  "Pre-Workout",
  "Post-Workout",
  "Akşam Atıştırması",
]);
const FALLBACK_MEAL_LABEL = "Ara Öğün";

const ALLOWED_PLAN_TYPES = new Set(["workout", "swimming", "rest", "nutrition"]);
const FALLBACK_PLAN_TYPE = "rest";

const ALLOWED_SECTIONS = new Set(["warmup", "main", "cooldown", "sauna", "swimming"]);
const FALLBACK_SECTION = "main";

// ─── Macro reasonableness bounds (per single meal) ─────────────────────────

const MEAL_CALORIE_MIN_EXCLUSIVE = 0;
const MEAL_CALORIE_MAX_EXCLUSIVE = 2500;
const MEAL_PROTEIN_MIN = 0;
const MEAL_PROTEIN_MAX = 150;

// Macro consistency: reported kcal vs computed (P*4 + C*4 + F*9). 15% slack
// covers fiber, alcohol, rounding, and chef's-prerogative wiggle.
const MACRO_CONSISTENCY_TOLERANCE = 0.15;

// Weekly-average vs expected target tolerance.
const TARGET_AVG_TOLERANCE = 0.15;

const TURKISH_DAY_NAMES_MAP: Record<string, number> = {
  pazartesi: 0,
  salı: 1,
  "salÄ±": 1,
  çarşamba: 2,
  "Ã§arÅŸamba": 2,
  perşembe: 3,
  "perÅŸembe": 3,
  cuma: 4,
  cumartesi: 5,
  pazar: 6,
};

function resolveDayOfWeek(dayName: string, aiDayOfWeek: number, index: number): number {
  const normalized = dayName.toLowerCase().trim();
  if (normalized in TURKISH_DAY_NAMES_MAP) {
    return TURKISH_DAY_NAMES_MAP[normalized];
  }
  if (aiDayOfWeek >= 0 && aiDayOfWeek <= 6) return aiDayOfWeek;
  return index;
}

function safeParseFloat(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

// ─── Per-field sanitizers ──────────────────────────────────────────────────

function sanitizeMealLabel(raw: unknown, ctx: string, warnings: string[]): string {
  const value = String(raw ?? "").trim();
  if (ALLOWED_MEAL_LABELS.has(value)) return value;
  warnings.push(
    `${ctx}: invalid mealLabel "${value || "<empty>"}" → coerced to "${FALLBACK_MEAL_LABEL}"`,
  );
  return FALLBACK_MEAL_LABEL;
}

function sanitizePlanType(raw: unknown, ctx: string, warnings: string[]): string {
  const value = String(raw ?? "").trim();
  if (ALLOWED_PLAN_TYPES.has(value)) return value;
  warnings.push(
    `${ctx}: invalid planType "${value || "<empty>"}" → coerced to "${FALLBACK_PLAN_TYPE}"`,
  );
  return FALLBACK_PLAN_TYPE;
}

function sanitizeSection(raw: unknown, ctx: string, warnings: string[]): string {
  const value = String(raw ?? "").trim();
  if (ALLOWED_SECTIONS.has(value)) return value;
  warnings.push(
    `${ctx}: invalid section "${value || "<empty>"}" → coerced to "${FALLBACK_SECTION}"`,
  );
  return FALLBACK_SECTION;
}

function sanitizeCalories(raw: unknown, ctx: string, warnings: string[]): number | null {
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

function sanitizeProteinG(raw: unknown, ctx: string, warnings: string[]): string | null {
  if (raw == null) return null;
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

function passthroughMacro(raw: unknown): string | null {
  return raw != null ? String(raw) : null;
}

function reconcileMealMacros(
  meal: AIMealItem,
  ctx: string,
  warnings: string[],
  strict: boolean,
): AIMealItem {
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

// ─── Public entry point ────────────────────────────────────────────────────

function isStrictMacroValidationEnabled(opts?: ValidateWeeklyPlanOptions): boolean {
  if (opts?.strictMacroValidation != null) return opts.strictMacroValidation;
  return process.env.STRICT_MACRO_VALIDATION === "true";
}

export function validateWeeklyPlan(
  data: unknown,
  expectedTargets?: ExpectedTargets,
  options?: ValidateWeeklyPlanOptions,
): ValidateWeeklyPlanResult {
  const obj = data as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.days)) {
    throw new Error("Invalid response format: expected { weekTitle, days: [...] }");
  }

  const warnings: string[] = [];
  const strict = isStrictMacroValidationEnabled(options);

  const days: AIWeeklyDay[] = (obj.days as Record<string, unknown>[]).map((day, index) => {
    const dayName = String(day.dayName ?? "");
    const dayCtx = `day[${index}] (${dayName || "?"})`;

    const meals: AIMealItem[] = Array.isArray(day.meals)
      ? (day.meals as Record<string, unknown>[]).map((m, mi) => {
          const mealCtx = `${dayCtx}.meal[${mi}]`;
          const sanitized: AIMealItem = {
            mealTime: String(m.mealTime ?? "08:00"),
            mealLabel: sanitizeMealLabel(m.mealLabel, mealCtx, warnings),
            content: String(m.content ?? ""),
            calories: sanitizeCalories(m.calories, mealCtx, warnings),
            proteinG: sanitizeProteinG(m.proteinG, mealCtx, warnings),
            carbsG: passthroughMacro(m.carbsG),
            fatG: passthroughMacro(m.fatG),
          };
          return reconcileMealMacros(sanitized, mealCtx, warnings, strict);
        })
      : [];

    const exercises: AIExerciseItem[] = Array.isArray(day.exercises)
      ? (day.exercises as Record<string, unknown>[]).map((ex, ei) => ({
          section: sanitizeSection(ex.section, `${dayCtx}.exercise[${ei}]`, warnings),
          sectionLabel: String(ex.sectionLabel ?? "Ana Antrenman"),
          name: String(ex.name ?? ""),
          englishName:
            ex.englishName != null && String(ex.englishName).trim() !== ""
              ? String(ex.englishName)
              : null,
          sets: ex.sets != null ? Number(ex.sets) : null,
          reps: ex.reps != null ? String(ex.reps) : null,
          restSeconds: ex.restSeconds != null ? Number(ex.restSeconds) : null,
          durationMinutes: ex.durationMinutes != null ? Number(ex.durationMinutes) : null,
          notes: ex.notes != null ? String(ex.notes) : null,
        }))
      : [];

    return {
      dayOfWeek: resolveDayOfWeek(dayName, Number(day.dayOfWeek ?? index), index),
      dayName,
      planType: sanitizePlanType(day.planType, dayCtx, warnings),
      workoutTitle: day.workoutTitle != null ? String(day.workoutTitle) : null,
      meals,
      exercises,
    };
  });

  // ─── Weekly average vs expected calorie target ────────────────────────
  if (expectedTargets?.calories) {
    const dailyTotals = days
      .map((d) => d.meals.reduce((sum, m) => sum + (m.calories ?? 0), 0))
      .filter((t) => t > 0);
    if (dailyTotals.length > 0) {
      const avg = dailyTotals.reduce((s, t) => s + t, 0) / dailyTotals.length;
      const drift = Math.abs(avg - expectedTargets.calories) / expectedTargets.calories;
      if (drift > TARGET_AVG_TOLERANCE) {
        warnings.push(
          `weekly-average kcal ${Math.round(avg)} drifts ${(drift * 100).toFixed(0)}% from target ${expectedTargets.calories} (tolerance ±${TARGET_AVG_TOLERANCE * 100}%)`,
        );
      }
    }
  }

  if (warnings.length > 0) {
    console.warn(`[validateWeeklyPlan] ${warnings.length} warning(s):`, warnings);
  }

  return {
    plan: {
      weekTitle: String(obj.weekTitle ?? "Haftalık Plan"),
      phase: String(obj.phase ?? "custom"),
      notes: obj.notes != null ? String(obj.notes) : null,
      days,
    },
    warnings,
  };
}
