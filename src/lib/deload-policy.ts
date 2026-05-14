/**
 * Pure deload-recommendation policy.
 *
 * Evaluates whether the user should run a deload week given their fitness
 * level, consecutive training streak, sleep quality/duration, and last
 * week's exercise completion rate. No DB access; the server action that
 * wraps this lives in `src/actions/deload.ts`.
 */

import type { Locale } from "@/lib/locale";

export interface DeloadEvaluationInput {
  fitnessLevel: string | null;
  weekNumber: number;
  /** Most recent → oldest is acceptable; the helper sorts internally. */
  recentPhases: { weekNumber: number; phase: string; startDate: string }[];
  sleep7d: {
    qualityAvg: number | null;
    durationAvg: number | null;
    samples: number;
  };
  /** 0..1; null when no exercises tracked last week. */
  lastWeekCompletionRate: number | null;
  /** 0..100 average readiness across the last 7d; null = insufficient data. */
  readiness7d: {
    average: number | null;
    samples: number;
    /** Per-day passive scores (chronological, may have fewer than 7 entries). */
    series: number[];
  };
}

export type DeloadSeverity = "hard" | "soft" | "none";

export type DeloadReasonCode =
  | "cadence"
  | "sleep_quality"
  | "sleep_duration"
  | "completion"
  | "low_readiness"
  | "fresh_start"
  | "just_deloaded";

export interface DeloadRecommendation {
  recommended: boolean;
  severity: DeloadSeverity;
  reasons: DeloadReasonCode[];
  consecutiveTrainingWeeks: number;
  cadence: number;
  /** Surfaced so the banner can render the actual avg/samples + trend. */
  readiness7d: {
    average: number | null;
    samples: number;
    series: number[];
  };
}

const SLEEP_QUALITY_THRESHOLD = 3.0;
const SLEEP_DURATION_THRESHOLD_MIN = 390;
const COMPLETION_THRESHOLD = 0.6;
const SLEEP_MIN_SAMPLES = 4;
const READINESS_FLOOR = 50;
const READINESS_MIN_SAMPLES = 4;
const DELOAD_PHASE_TAG = "deload";

/**
 * Returns the deload cadence (in weeks) for the given fitness level.
 * Beginners deload most often, advanced users least often. Null/unknown
 * defaults to the "advanced" cadence — fewer unsolicited interventions.
 */
export function getDeloadCadence(fitnessLevel: string | null | undefined): number {
  if (fitnessLevel === "beginner") return 4;
  if (fitnessLevel === "intermediate") return 5;
  return 6;
}

function countConsecutiveTrainingWeeks(
  recentPhases: DeloadEvaluationInput["recentPhases"],
): number {
  // Sort newest → oldest so we can break on the first deload.
  const sorted = [...recentPhases].sort((a, b) => b.weekNumber - a.weekNumber);
  let count = 0;
  for (const row of sorted) {
    if (row.phase.trim().toLowerCase() === DELOAD_PHASE_TAG) break;
    count += 1;
  }
  return count;
}

function wasLastWeekDeload(
  recentPhases: DeloadEvaluationInput["recentPhases"],
): boolean {
  if (recentPhases.length === 0) return false;
  const sorted = [...recentPhases].sort((a, b) => b.weekNumber - a.weekNumber);
  return sorted[0].phase.trim().toLowerCase() === DELOAD_PHASE_TAG;
}

export function evaluateDeloadCandidacy(input: DeloadEvaluationInput): DeloadRecommendation {
  const cadence = getDeloadCadence(input.fitnessLevel);
  const consecutiveTrainingWeeks = countConsecutiveTrainingWeeks(input.recentPhases);

  if (input.recentPhases.length === 0) {
    return {
      recommended: false,
      severity: "none",
      reasons: ["fresh_start"],
      consecutiveTrainingWeeks,
      cadence,
      readiness7d: input.readiness7d,
    };
  }

  if (wasLastWeekDeload(input.recentPhases)) {
    return {
      recommended: false,
      severity: "none",
      reasons: ["just_deloaded"],
      consecutiveTrainingWeeks,
      cadence,
      readiness7d: input.readiness7d,
    };
  }

  const reasons: DeloadReasonCode[] = [];
  const sleepSamplesOk = input.sleep7d.samples >= SLEEP_MIN_SAMPLES;

  if (consecutiveTrainingWeeks >= cadence) {
    reasons.push("cadence");
  }
  if (
    sleepSamplesOk &&
    input.sleep7d.qualityAvg != null &&
    input.sleep7d.qualityAvg < SLEEP_QUALITY_THRESHOLD
  ) {
    reasons.push("sleep_quality");
  }
  if (
    sleepSamplesOk &&
    input.sleep7d.durationAvg != null &&
    input.sleep7d.durationAvg < SLEEP_DURATION_THRESHOLD_MIN
  ) {
    reasons.push("sleep_duration");
  }
  if (
    input.lastWeekCompletionRate != null &&
    input.lastWeekCompletionRate < COMPLETION_THRESHOLD
  ) {
    reasons.push("completion");
  }
  if (
    input.readiness7d.samples >= READINESS_MIN_SAMPLES &&
    input.readiness7d.average != null &&
    input.readiness7d.average < READINESS_FLOOR
  ) {
    reasons.push("low_readiness");
  }

  const hasHard = reasons.includes("cadence");
  const softReasons = reasons.filter((r) => r !== "cadence");
  const hasSoft = softReasons.length >= 2;

  let severity: DeloadSeverity = "none";
  let recommended = false;
  if (hasHard) {
    severity = "hard";
    recommended = true;
  } else if (hasSoft) {
    severity = "soft";
    recommended = true;
  }

  return {
    recommended,
    severity,
    reasons,
    consecutiveTrainingWeeks,
    cadence,
    readiness7d: input.readiness7d,
  };
}

/**
 * Builds the deload instructions block for the weekly workout prompt.
 * Appended to the user message — system prompt stays cache-warm.
 */
export function buildDeloadWorkoutBlock(locale: Locale): string {
  if (locale === "en") {
    return [
      "═══ DELOAD WEEK — VOLUME REDUCTION ═══",
      "This week is a DELOAD week. Use the previous weeks' programs as reference and follow these rules:",
      "- REDUCE total set count to 50-60% of last week (e.g. 16 sets → 8-10 sets).",
      "- KEEP intensity (load / resistance level) at last week's level — only volume drops, not intensity.",
      "- KEEP compound (squat / bench / row / deadlift) core movements; remove or reduce taxing accessory / isolation work.",
      "- Reps per set may be slightly lower than last week (drop 1-2 reps). DO NOT push to failure.",
      "- Set the `phase` field to **deload** (the system tracks deload weeks via this tag).",
      "═══════════════════════════════════════",
    ].join("\n");
  }

  return [
    "═══ DELOAD HAFTASI — VOLUME REDÜKSİYONU ═══",
    "Bu hafta DELOAD haftası. Önceki haftaların antrenmanını referans alarak ŞU kurallarla düzenle:",
    "- Toplam set sayısını önceki haftanın %50-60'ına DÜŞÜR (örn: 16 set → 8-10 set).",
    "- Yoğunluk (kullanılan ağırlık / direnç seviyesi) önceki hafta düzeyinde KALSIN — yalnızca volume azalır, intensity değil.",
    "- Compound (squat / bench / row / deadlift) çekirdek hareketleri KORU; yorucu accessory / izolasyon hareketlerini çıkar veya azalt.",
    "- Set başına rep sayısı önceki haftadan biraz daha düşük olabilir (1-2 rep azalt). Failure'a YAKLAŞMA.",
    "- \"phase\" alanını MUTLAKA \"deload\" olarak doldur (sistem bu etiketle deload haftasını izler).",
    "═══════════════════════════════════════════",
  ].join("\n");
}

/**
 * Builds the deload instructions block for the weekly nutrition prompt.
 * Appended to the user message — system prompt stays cache-warm.
 */
export function buildDeloadNutritionBlock(locale: Locale): string {
  if (locale === "en") {
    return [
      "═══ DELOAD WEEK — NUTRITION ADJUSTMENT ═══",
      "This week is a DELOAD week — training volume is lower, recovery is the priority.",
      "- Daily calorie target is shifted toward maintenance (the strategy delta has been scaled to ~40% of normal).",
      "- Protein target IS UNCHANGED — muscle preservation is critical (do not lower protein during deload).",
      "- Carbohydrates may be slightly reduced (less workout-window concentration is needed).",
      "- Keep fat moderate; favor anti-inflammatory foods (fatty fish, olive oil, nuts).",
      "- Set the `phase` field to **deload**.",
      "═══════════════════════════════════════════",
    ].join("\n");
  }

  return [
    "═══ DELOAD HAFTASI — BESLENME AYARI ═══",
    "Bu hafta DELOAD haftası — antrenman volume'u azaldı, recovery önceliği var.",
    "- Günlük kalori hedefi maintenance'a yaklaştırıldı (delta önceki hafta normalinin %40'ına indirildi).",
    "- Protein hedefi DEĞİŞMEZ — kas koruma kritik (deload haftasında protein düşürme).",
    "- Carbs hafif azaltılabilir (antrenman çevresi yoğunlaşması azaldığı için).",
    "- Yağ orta düzeyde tut; iltihaplanma karşıtı gıdaları (yağlı balık, zeytinyağı, fındık) öncelikle.",
    "- \"phase\" alanını \"deload\" olarak doldur.",
    "═══════════════════════════════════════════",
  ].join("\n");
}

/** Multiplier applied to the calorie delta during deload weeks. */
export const DELOAD_CALORIE_DELTA_MULTIPLIER = 0.4;
