/**
 * Goal-adaptive per-day-type carb cycling.
 *
 * Workout days get a carb pump (+15-30%), rest days a taper, so weekly mean
 * still hits the baseline carb target — the weight-goal trajectory is
 * preserved. Protein and fat stay constant; calories follow carbs.
 *
 * All math is pure; the DB-glue lives in `src/lib/macro-targets.ts`.
 */

import type { FitnessGoal } from "@/lib/meal-timing";
import type { MacroTargets } from "@/lib/macro-targets";

export type DayType = "workout" | "swimming" | "rest" | "nutrition";

export type CarbCyclingLabel = "off" | "moderate" | "aggressive";

export interface CarbCyclingProfile {
  enabled: boolean;
  workoutCarbMultiplier: number;
  swimmingCarbMultiplier: number;
  restCarbMultiplier: number;
  label: CarbCyclingLabel;
}

const PROFILE_OFF: CarbCyclingProfile = {
  enabled: false,
  workoutCarbMultiplier: 1,
  swimmingCarbMultiplier: 1,
  restCarbMultiplier: 1,
  label: "off",
};

const PROFILE_MODERATE: CarbCyclingProfile = {
  enabled: true,
  workoutCarbMultiplier: 1.15,
  swimmingCarbMultiplier: 1.10,
  restCarbMultiplier: 0.85,
  label: "moderate",
};

const PROFILE_AGGRESSIVE: CarbCyclingProfile = {
  enabled: true,
  workoutCarbMultiplier: 1.30,
  swimmingCarbMultiplier: 1.20,
  restCarbMultiplier: 0.75,
  label: "aggressive",
};

/**
 * Picks the cycling profile for the user's fitness goal. Deload weeks always
 * disable cycling — recovery is best served by uniform nutrition.
 */
export function getCarbCyclingProfile(
  fitnessGoal: FitnessGoal | null | undefined,
  deloadWeek?: boolean,
): CarbCyclingProfile {
  if (deloadWeek) return PROFILE_OFF;
  if (fitnessGoal === "loss" || fitnessGoal === "recomp") return PROFILE_MODERATE;
  if (fitnessGoal === "muscle_gain" || fitnessGoal === "weight_gain") return PROFILE_AGGRESSIVE;
  return PROFILE_OFF;
}

export interface WeeklyMacroTargets {
  baseline: MacroTargets;
  perDayType: Record<DayType, MacroTargets>;
  cyclingProfile: CarbCyclingProfile;
}

function macroTargetsForCarbs(baseline: MacroTargets, carbs: number): MacroTargets {
  const calories = Math.round(baseline.protein * 4 + carbs * 4 + baseline.fat * 9);
  return {
    calories,
    protein: baseline.protein,
    carbs,
    fat: baseline.fat,
  };
}

/**
 * Distributes baseline carbs across the week, pumping workout / swimming days
 * and tapering rest / nutrition days so the weekly mean still equals baseline.
 * Rest carbs are clamped at `minCarbsFloor`; clamping may push weekly mean
 * above baseline (accepted — see plan docs).
 */
export function applyCarbCycling(
  baseline: MacroTargets,
  dayTypeCounts: Record<DayType, number>,
  profile: CarbCyclingProfile,
  minCarbsFloor: number,
): WeeklyMacroTargets {
  if (!profile.enabled) {
    return {
      baseline,
      perDayType: {
        workout: baseline,
        swimming: baseline,
        rest: baseline,
        nutrition: baseline,
      },
      cyclingProfile: profile,
    };
  }

  const workoutCarbs = Math.round(baseline.carbs * profile.workoutCarbMultiplier);
  const swimmingCarbs = Math.round(baseline.carbs * profile.swimmingCarbMultiplier);

  const W = dayTypeCounts.workout ?? 0;
  const S = dayTypeCounts.swimming ?? 0;
  const R = dayTypeCounts.rest ?? 0;
  const N = dayTypeCounts.nutrition ?? 0;
  const restPoolSize = R + N;

  let restCarbs: number;
  if (restPoolSize === 0) {
    // Every day is training — no rest reduction; restCarbs is unused in render
    // but kept consistent for the perDayType map.
    restCarbs = baseline.carbs;
  } else {
    const nonRestCarbsWeekly = W * workoutCarbs + S * swimmingCarbs;
    const baselineWeeklyCarbs = 7 * baseline.carbs;
    const remaining = baselineWeeklyCarbs - nonRestCarbsWeekly;
    const computed = Math.round(remaining / restPoolSize);
    restCarbs = Math.max(computed, minCarbsFloor);
  }

  return {
    baseline,
    perDayType: {
      workout: macroTargetsForCarbs(baseline, workoutCarbs),
      swimming: macroTargetsForCarbs(baseline, swimmingCarbs),
      rest: macroTargetsForCarbs(baseline, restCarbs),
      nutrition: macroTargetsForCarbs(baseline, restCarbs),
    },
    cyclingProfile: profile,
  };
}

/**
 * Single-day variant: when the daily flow doesn't know the full week shape,
 * it just applies the multiplier for the given planType. No cluster constraint.
 */
export function applyCarbCyclingSingleDay(
  baseline: MacroTargets,
  planType: string | null | undefined,
  profile: CarbCyclingProfile,
  minCarbsFloor: number,
): MacroTargets {
  if (!profile.enabled) return baseline;
  let multiplier = 1;
  if (planType === "workout") multiplier = profile.workoutCarbMultiplier;
  else if (planType === "swimming") multiplier = profile.swimmingCarbMultiplier;
  else if (planType === "rest" || planType === "nutrition") multiplier = profile.restCarbMultiplier;
  else return baseline;
  const carbs = Math.max(Math.round(baseline.carbs * multiplier), minCarbsFloor);
  return macroTargetsForCarbs(baseline, carbs);
}

const TR_DAY_TYPE_LABEL: Record<DayType, string> = {
  workout: "🏋 ANTRENMAN GÜNÜ",
  swimming: "🏊 YÜZME GÜNÜ",
  rest: "🌙 DİNLENME GÜNÜ",
  nutrition: "🌙 DİNLENME GÜNÜ",
};

const EN_DAY_TYPE_LABEL: Record<DayType, string> = {
  workout: "🏋 WORKOUT DAY",
  swimming: "🏊 SWIMMING DAY",
  rest: "🌙 REST DAY",
  nutrition: "🌙 REST DAY",
};

const TR_CYCLING_LABEL: Record<CarbCyclingLabel, string> = {
  off: "kapalı",
  moderate: "orta",
  aggressive: "agresif",
};

const EN_CYCLING_LABEL: Record<CarbCyclingLabel, string> = {
  off: "off",
  moderate: "moderate",
  aggressive: "aggressive",
};

/**
 * Renders the per-day-type macro target block for the weekly nutrition prompt.
 * Only emitted when `cyclingProfile.enabled` — caller decides which block to
 * use (single vs per-day-type).
 */
export function buildCyclingTargetsBlock(
  targets: WeeklyMacroTargets,
  dayTypeCounts: Record<DayType, number>,
  locale: "tr" | "en",
): string {
  const labelMap = locale === "en" ? EN_DAY_TYPE_LABEL : TR_DAY_TYPE_LABEL;
  const cyclingLabelMap = locale === "en" ? EN_CYCLING_LABEL : TR_CYCLING_LABEL;
  const cyclingLabel = cyclingLabelMap[targets.cyclingProfile.label];

  const presentTypes: DayType[] = ["workout", "swimming", "rest", "nutrition"].filter(
    (t) => (dayTypeCounts[t as DayType] ?? 0) > 0,
  ) as DayType[];
  // De-duplicate rest/nutrition (both labelled "REST DAY")
  const seenLabels = new Set<string>();
  const renderTypes = presentTypes.filter((t) => {
    const lbl = labelMap[t];
    if (seenLabels.has(lbl)) return false;
    seenLabels.add(lbl);
    return true;
  });

  const lines: string[] = [];
  if (locale === "en") {
    lines.push(`═══ MACRO TARGETS (Carb Cycling: ${cyclingLabel}) ═══`);
  } else {
    lines.push(`═══ HESAPLANMIŞ MAKRO HEDEFLERİ (Carb Cycling: ${cyclingLabel}) ═══`);
  }
  for (const dt of renderTypes) {
    const t = targets.perDayType[dt];
    if (locale === "en") {
      lines.push(`${labelMap[dt]}: ${t.calories} kcal / ${t.protein}g protein / ${t.carbs}g carbs / ${t.fat}g fat`);
    } else {
      lines.push(`${labelMap[dt]}: ${t.calories} kcal / ${t.protein}g protein / ${t.carbs}g carbs / ${t.fat}g yağ`);
    }
  }
  if (locale === "en") {
    lines.push(
      `Weekly average: ${targets.baseline.calories} kcal/day (the user's baseline target).`,
      "Training days carb-pump (glycogen + performance); rest days carb-taper (insulin control). Protein and fat stay the same every day.",
      "═══════════════════════════════════════════",
    );
  } else {
    lines.push(
      `Haftalık ortalama: ${targets.baseline.calories} kcal/gün (kullanıcının baseline hedefi).`,
      "Antrenman günleri carb pump (glikojen + performans); dinlenme günleri carb taper (insülin kontrolü). Protein ve yağ her gün AYNI.",
      "═══════════════════════════════════════════",
    );
  }
  return lines.join("\n");
}
