/**
 * Build the proactive "tell the AI what we'll check after" blocks. Volume
 * bands and previous-week breakdowns are computed deterministically before
 * the AI call; injecting them into the user message lets the model produce
 * a plan that already lands inside the bands instead of relying on the
 * post-validation retry loop to nudge it back. Reactive checks still run
 * — these blocks just shrink the warning surface they have to fire on.
 */
import type { MuscleVolumeBandsResult, MuscleGroup } from "@/lib/muscle-volume-validator";
import type { Locale } from "@/lib/locale";
import type { Pattern } from "@/lib/ai-workout-summary";

const MUSCLE_ORDER: MuscleGroup[] = ["chest", "back", "legs", "shoulders", "arms"];
const PATTERN_ORDER: Pattern[] = ["push", "pull", "lower", "full_body", "mixed"];

const MUSCLE_LABEL_TR: Record<MuscleGroup, string> = {
  chest: "Göğüs",
  back: "Sırt",
  legs: "Bacak",
  shoulders: "Omuz",
  arms: "Kol",
};
const MUSCLE_LABEL_EN: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
};

function muscleLabel(group: MuscleGroup, locale: Locale): string {
  return locale === "en" ? MUSCLE_LABEL_EN[group] : MUSCLE_LABEL_TR[group];
}

/**
 * Render the dynamic MEV-MRV bands the muscle-volume validator will check
 * against. The AI should target the middle of each band; landing outside
 * trips a soft warning.
 */
export function buildVolumeBandsBlock(
  bands: MuscleVolumeBandsResult,
  locale: Locale,
): string {
  const rows = MUSCLE_ORDER.map((g) => {
    const b = bands.bands[g];
    const label = muscleLabel(g, locale).padEnd(10);
    return `  ${label} ${b.min}-${b.max} set/${locale === "en" ? "week" : "hafta"}`;
  }).join("\n");
  if (locale === "en") {
    return `\n\n═══ COMPUTED WEEKLY MUSCLE VOLUME TARGETS ═══
Profile: ${bands.profileLabel}
${rows}
USAGE: Total weekly main+swimming set count per muscle group MUST land inside these ranges. The middle of each band is the safest landing zone.`;
  }
  return `\n\n═══ HESAPLANMIŞ HAFTALIK KAS GRUBU HACİM HEDEFLERİ ═══
Profil: ${bands.profileLabel}
${rows}
KULLANIM: Her kas grubu için toplam haftalık main+swimming set sayısı yukarıdaki aralıkta olmalı. Bandın ortası en güvenli hedef.`;
}

export interface PreviousWeekBreakdownInput {
  total: number;
  byMuscle: Record<MuscleGroup, number>;
  byPattern: Record<Pattern, number>;
}

/**
 * Render the previous week's per-muscle and per-pattern set distribution
 * so the AI has a numeric reference point for progressive overload (and so
 * it doesn't accidentally flip the whole week to a different pattern).
 * Skipped when there is no prior week to compare against (total <= 0).
 */
export function buildPreviousVolumeBlock(
  breakdown: PreviousWeekBreakdownInput,
  locale: Locale,
): string {
  if (breakdown.total <= 0) return "";
  const muscleParts = MUSCLE_ORDER.map((g) => `${g}=${breakdown.byMuscle[g] ?? 0}`).join(", ");
  const patternParts = PATTERN_ORDER
    .filter((p) => (breakdown.byPattern[p] ?? 0) > 0)
    .map((p) => `${p}=${breakdown.byPattern[p]}`)
    .join(", ");
  if (locale === "en") {
    return `\n\n═══ PREVIOUS WEEK VOLUME SUMMARY (progression reference) ═══
Total working sets: ${breakdown.total}
By muscle: ${muscleParts}
By pattern: ${patternParts || "n/a"}
USAGE: Each muscle group should grow 0-30% over previous week (deload weeks: drop ≥20%). Don't flip the dominant movement pattern from one week to the next.`;
  }
  return `\n\n═══ GEÇEN HAFTA HACİM ÖZETİ (PROGRESYON REFERANSI) ═══
Toplam çalışan set: ${breakdown.total}
Kas grubu: ${muscleParts}
Hareket paterni: ${patternParts || "veri yok"}
KULLANIM: Her kas grubu için %0-30 artış hedefle (deload haftası ise en az %20 azalt). Baskın hareket paternini hafta haftaya çevirme.`;
}
