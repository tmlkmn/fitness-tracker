/**
 * Goal gating — derive/validate the fitness goal from body composition.
 *
 * The macro engine, carb cycling, and AI prompts all take the user's chosen
 * goal at face value. For a high-body-fat / obese user that means a "Lean
 * Bulk" choice produces a calorie SURPLUS — fat on top of fat. This pure rule
 * gates surplus goals: high body fat or an obese BMI is redirected to a
 * fat-loss (or recomposition) phase. Bulking unlocks once body fat drops.
 *
 * Pure + locale-aware reason string; the DB glue lives in `macro-targets.ts`
 * (`resolveEffectiveGoal`) and `ai-user-profile-block.ts`.
 */
import type { FitnessGoal } from "@/lib/meal-timing";

export type GatingGender = "male" | "female" | "prefer_not_to_say";

export interface BodyComposition {
  bodyFatPct: number | null;
  bmi: number | null;
  gender: GatingGender;
}

export interface GoalGateResult {
  /** The goal to actually use (gated when body composition contraindicates a bulk). */
  goal: FitnessGoal;
  /** True when the chosen goal was overridden. */
  gated: boolean;
  /** Locale-aware explanation when gated; null otherwise. */
  reason: string | null;
}

// BMI bands (WHO): ≥30 obese, ≥27 overweight (Asian-adjusted-ish midpoint).
const BMI_OBESE = 30;
const BMI_OVERWEIGHT = 27;
// Body-fat % cutoffs by sex. "very high" → fat loss; "high" → recomposition.
const BF_VERY_HIGH = { male: 26, female: 35 } as const;
const BF_HIGH = { male: 22, female: 30 } as const;

/** BMI from weight (kg) and height (cm). Null when inputs are unusable. */
export function computeBMI(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/**
 * Gates a chosen goal by body composition. Only SURPLUS goals (muscle_gain,
 * weight_gain) are gated — deficit/maintenance goals pass through unchanged.
 *
 * Body fat % is the AUTHORITATIVE signal when measured: a muscular person with
 * a high BMI but low body fat is NOT gated (BMI can't tell muscle from fat).
 * The BMI bands apply ONLY as a fallback when no body-fat measurement exists,
 * so an obese user who never logged a scan is still caught.
 */
export function gateGoalByComposition(
  chosenGoal: FitnessGoal,
  body: BodyComposition,
  locale: "tr" | "en" = "tr",
): GoalGateResult {
  if (chosenGoal !== "muscle_gain" && chosenGoal !== "weight_gain") {
    return { goal: chosenGoal, gated: false, reason: null };
  }

  const female = body.gender === "female";
  const { bodyFatPct: bf, bmi } = body;

  // Measured body fat wins — BMI over-counts lean mass for a muscular build.
  if (bf != null) {
    if (bf > (female ? BF_VERY_HIGH.female : BF_VERY_HIGH.male)) {
      return { goal: "loss", gated: true, reason: gateReason("loss", bf, bmi, locale) };
    }
    if (bf > (female ? BF_HIGH.female : BF_HIGH.male)) {
      return { goal: "recomp", gated: true, reason: gateReason("recomp", bf, bmi, locale) };
    }
    // Low/normal body fat → a bulk is fine even if BMI reads "obese" (muscle).
    return { goal: chosenGoal, gated: false, reason: null };
  }

  // No body-fat measurement → fall back to BMI bands alone.
  if (bmi != null && bmi >= BMI_OBESE) {
    return { goal: "loss", gated: true, reason: gateReason("loss", bf, bmi, locale) };
  }
  if (bmi != null && bmi >= BMI_OVERWEIGHT) {
    return { goal: "recomp", gated: true, reason: gateReason("recomp", bf, bmi, locale) };
  }
  return { goal: chosenGoal, gated: false, reason: null };
}

function gateReason(
  to: "loss" | "recomp",
  bf: number | null,
  bmi: number | null,
  locale: "tr" | "en",
): string {
  const bmiStr = bmi == null ? "—" : bmi.toFixed(1);
  if (locale === "en") {
    const bfStr = bf == null ? "n/a" : `~${Math.round(bf)}%`;
    const phase = to === "loss"
      ? "a fat-loss phase (calorie deficit + high protein)"
      : "a recomposition phase (slight deficit, very high protein)";
    return `Body fat ${bfStr} / BMI ${bmiStr} is high — applied ${phase} instead of a surplus. Bulking is recommended once body fat reaches ~15-18%.`;
  }
  const bfStr = bf == null ? "—" : `~%${Math.round(bf)}`;
  const phase = to === "loss"
    ? "yağ kaybı fazı (kalori açığı + yüksek protein)"
    : "rekomposizyon fazı (hafif açık, çok yüksek protein)";
  return `Vücut yağı ${bfStr} / BMI ${bmiStr} yüksek — kütle fazlası yerine ${phase} uygulandı. Bulk, yağ ~%15-18'e indiğinde önerilir.`;
}
