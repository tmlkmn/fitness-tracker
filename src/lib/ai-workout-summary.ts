/**
 * Deterministic per-day summary of a generated weekly workout plan.
 *
 * Feeds the "high accuracy mode" nutrition stage so the nutrition prompt
 * sees the *actual* produced volume (set count, dominant movement pattern,
 * estimated duration) rather than only the planned dayMode.
 *
 * No AI call here — keeps latency unchanged for the summary step.
 */

import type { AIWeeklyPlan } from "@/lib/ai-weekly-types";
import type { Locale } from "@/lib/locale";

export interface ProducedWorkoutDaySummary {
  dayOfWeek: number;
  planType: "workout" | "swimming" | "rest" | "nutrition";
  /** Human-readable summary in the requested locale. */
  summary: string;
}

const TR_DAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;
const EN_DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type Pattern = "lower" | "push" | "pull" | "full_body" | "mixed";

const PATTERN_KEYWORDS: Record<Exclude<Pattern, "mixed">, string[]> = {
  lower: ["squat", "lunge", "deadlift", "leg press", "calf", "hip thrust", "bacak", "kalça", "uyluk"],
  push: ["bench", "push", "press", "dip", "fly", "şınav", "itiş", "bench press"],
  pull: ["row", "pull", "lat", "curl", "chin", "deadlift", "kürek", "çekiş", "biceps"],
  full_body: ["full body", "compound", "tam vücut", "komple"],
};

/**
 * Classify a single exercise name into one of the movement patterns above.
 * Exported for reuse by the per-pattern progressive-overload validator so
 * pattern bucketing stays consistent with the workout-summary block.
 */
export function detectExercisePattern(name: string): Pattern {
  const lower = name.toLowerCase();
  for (const [pattern, keywords] of Object.entries(PATTERN_KEYWORDS) as [Exclude<Pattern, "mixed">, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) return pattern;
  }
  return "mixed";
}

function detectDominantPattern(exerciseNames: string[]): Pattern {
  if (exerciseNames.length === 0) return "mixed";
  const counts: Record<Exclude<Pattern, "mixed">, number> = { lower: 0, push: 0, pull: 0, full_body: 0 };
  for (const raw of exerciseNames) {
    const name = raw.toLowerCase();
    for (const [pattern, keywords] of Object.entries(PATTERN_KEYWORDS) as [Exclude<Pattern, "mixed">, string[]][]) {
      if (keywords.some((kw) => name.includes(kw))) {
        counts[pattern] += 1;
      }
    }
  }
  let best: Exclude<Pattern, "mixed"> | null = null;
  let bestCount = 0;
  for (const p of Object.keys(counts) as Exclude<Pattern, "mixed">[]) {
    if (counts[p] > bestCount) {
      best = p;
      bestCount = counts[p];
    }
  }
  // Require at least one hit AND the leading pattern must beat the runner-up.
  if (best === null || bestCount === 0) return "mixed";
  return best;
}

function patternLabel(pattern: Pattern, locale: Locale): string {
  if (locale === "en") {
    if (pattern === "lower") return "lower-body focus";
    if (pattern === "push") return "push focus";
    if (pattern === "pull") return "pull focus";
    if (pattern === "full_body") return "full-body";
    return "mixed";
  }
  if (pattern === "lower") return "alt vücut odaklı";
  if (pattern === "push") return "itiş odaklı";
  if (pattern === "pull") return "çekiş odaklı";
  if (pattern === "full_body") return "tam vücut";
  return "karma";
}

function estimateMinutes(mainCount: number, totalSets: number): number {
  if (mainCount === 0 && totalSets === 0) return 0;
  // ~10 dk warmup + ~2.5 dk per main set + ~5 dk cooldown.
  const raw = 10 + totalSets * 2.5 + 5;
  return Math.round(raw / 5) * 5;
}

function summarizeWorkoutDay(
  day: AIWeeklyPlan["days"][number],
  locale: Locale,
): string {
  const main = day.exercises.filter((e) => e.section === "main");
  const mainCount = main.length;
  const totalSets = main.reduce((sum, e) => sum + (e.sets ?? 0), 0);
  if (mainCount === 0 && totalSets === 0) {
    return locale === "en"
      ? "workout planned but no exercises produced"
      : "antrenman planlanmış ama egzersiz üretilmemiş";
  }
  const pattern = detectDominantPattern(main.map((e) => e.name));
  const label = patternLabel(pattern, locale);
  const minutes = estimateMinutes(mainCount, totalSets);
  if (locale === "en") {
    return `${mainCount} main exercise(s) / ${totalSets} sets, ${label}, ~${minutes} min`;
  }
  return `${mainCount} ana hareket / ${totalSets} set, ${label}, ~${minutes} dk`;
}

function summarizeSwimmingDay(
  day: AIWeeklyPlan["days"][number],
  locale: Locale,
): string {
  const swim = day.exercises.filter((e) => e.section === "swimming");
  const minutes = swim.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
  if (minutes > 0) {
    return locale === "en" ? `swimming — ~${Math.round(minutes)} min` : `yüzme — ~${Math.round(minutes)} dk`;
  }
  return locale === "en" ? "swimming day" : "yüzme günü";
}

/**
 * Produces a per-day workout summary array for the seven days of the week.
 *
 * Past days are still included but with a "skip" planType (treated as
 * rest by callers); the caller is responsible for filtering when building
 * the nutrition prompt block.
 */
export function summarizeProducedWorkout(
  plan: AIWeeklyPlan,
  locale: Locale,
): ProducedWorkoutDaySummary[] {
  const out: ProducedWorkoutDaySummary[] = [];
  for (const day of plan.days) {
    const planType = (day.planType as ProducedWorkoutDaySummary["planType"]) ?? "rest";
    let summary: string;
    if (planType === "rest" || planType === "nutrition") {
      summary = locale === "en" ? "rest day" : "dinlenme günü";
    } else if (planType === "swimming") {
      summary = summarizeSwimmingDay(day, locale);
    } else if (planType === "workout") {
      summary = summarizeWorkoutDay(day, locale);
    } else {
      summary = locale === "en" ? "rest day" : "dinlenme günü";
    }
    out.push({ dayOfWeek: day.dayOfWeek, planType, summary });
  }
  return out.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

/**
 * Returns true if no produced workout day contains any exercises across the
 * whole week. Used by the orchestrator to abort early before the nutrition
 * stage in high-accuracy mode.
 */
export function isProducedWorkoutEmpty(plan: AIWeeklyPlan): boolean {
  return plan.days.every((d) => d.exercises.length === 0);
}

/**
 * Builds the "produced workout summary" block that is appended to the
 * nutrition user message in high-accuracy mode. System prompt is untouched
 * so Anthropic ephemeral cache stays warm.
 */
export function buildProducedWorkoutBlock(
  summaries: ProducedWorkoutDaySummary[],
  locale: Locale,
): string {
  const dayLabels = locale === "en" ? EN_DAY_SHORT : TR_DAY_SHORT;
  const lines = summaries.map((s) => `${dayLabels[s.dayOfWeek]}: ${s.summary}`);

  if (locale === "en") {
    return [
      "═══ PRODUCED WORKOUT SUMMARY (reference) ═══",
      ...lines,
      "On workout days add +250-400 kcal of carbohydrate pump (especially in the pre/post-workout meal).",
      "On rest days keep the protein target but you may slightly lower carbs.",
      "═══════════════════════════════════════════",
    ].join("\n");
  }

  return [
    "═══ ÜRETİLMİŞ ANTRENMAN ÖZETİ (referans) ═══",
    ...lines,
    "Antrenman günlerinde +250-400 kcal carb pump ekle (özellikle antrenman öncesi/sonrası öğüne).",
    "Dinlenme günlerinde protein hedefini koruyarak carbs'i hafif azaltabilirsin.",
    "═══════════════════════════════════════════",
  ].join("\n");
}
