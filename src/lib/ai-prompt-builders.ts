/**
 * User-message builders for the daily AI features (meal generation,
 * workout replacement, section replacement, exercise variation).
 *
 * These produce the EXACT same string the inline templates produced — they
 * are pure functions to make prompt changes diffable and testable. The
 * system prompts live in `ai-prompts.ts`; these only build user messages.
 */

import "server-only";
import type { Locale } from "@/lib/locale";
import type { MacroTargets } from "@/lib/macro-targets";
import type { SupplementBudget } from "@/lib/supplement-budget";
import { buildSupplementInfoBlock } from "@/lib/supplement-budget";
import { buildUserNotePriorityBlock } from "@/lib/ai";

function appendUserNote(base: string, userNote: string | null | undefined): string {
  return userNote && userNote.trim() ? base + buildUserNotePriorityBlock(userNote) : base;
}

// ─── Daily meal prompt ──────────────────────────────────────────────────────

export interface CurrentMealForPrompt {
  mealTime: string;
  mealLabel: string;
  content: string;
}

export interface DailyMealPromptInput {
  locale: Locale;
  mealContext: string;
  targets: MacroTargets | null;
  isNutritionOnly: boolean;
  userNote: string | null;
  /**
   * Current meals for this day (if any). When provided, an "improve this
   * layout" reference block is added so the AI preserves the user's familiar
   * meal times/labels while upgrading content + macros toward the target.
   */
  currentMeals?: CurrentMealForPrompt[];
  /**
   * Daily supplement contribution. When supplementsCount > 0, an info block
   * is prepended and `targets` are expected to already be supplement-adjusted.
   */
  supplementBudget?: SupplementBudget | null;
}

function buildCurrentMealsBlock(
  locale: Locale,
  currentMeals: CurrentMealForPrompt[] | undefined,
): string {
  if (!currentMeals || currentMeals.length === 0) return "";
  const items = currentMeals
    .map((m) => `  ${m.mealTime} ${m.mealLabel}: ${m.content.slice(0, 80)}`)
    .join("\n");
  return locale === "en"
    ? `\n\n═══ CURRENT MEAL LAYOUT (reference) ═══\n${items}\nYou don't have to replace this layout entirely — keep the meal times and labels the user is accustomed to, and upgrade content + macros toward the target.\n══════════════════════════════════════\n`
    : `\n\n═══ MEVCUT ÖĞÜN DÜZENİ (referans) ═══\n${items}\nBu düzeni TAMAMEN değiştirme zorunluluğun yok — kullanıcının alıştığı saatleri ve öğün etiketlerini koru; içeriği ve makroyu hedefe göre iyileştir.\n═══════════════════════════════════\n`;
}

export function buildDailyMealPrompt(input: DailyMealPromptInput): string {
  const { locale, mealContext, targets, isNutritionOnly, userNote, currentMeals, supplementBudget } = input;

  const supplementBlock = supplementBudget && supplementBudget.supplementsCount > 0
    ? `\n\n${buildSupplementInfoBlock(supplementBudget, locale)}`
    : "";

  let targetsBlock = "";
  if (targets) {
    targetsBlock = locale === "en"
      ? `\n\n═══ COMPUTED DAILY MACRO TARGETS ═══
Calories: ${targets.calories} kcal
Protein: ${targets.protein}g
Carbs: ${targets.carbs}g
Fat: ${targets.fat}g
These targets are computed via Mifflin-St Jeor + LBM based on the user's gender, age, weight, height, activity level, and fitness goal. The plan must match within ±5%.`
      : `\n\n═══ HESAPLANMIŞ GÜNLÜK MAKRO HEDEFLERİ ═══
Kalori: ${targets.calories} kcal
Protein: ${targets.protein}g
Karbonhidrat: ${targets.carbs}g
Yağ: ${targets.fat}g
Bu hedefler kullanıcının cinsiyet, yaş, kilo, boy, aktivite seviyesi ve fitness hedefine göre Mifflin-St Jeor + LBM bazlı hesaplanmıştır. Beslenme programı bu hedeflere ±%5 toleransla uymalı.`;
  }

  const taskLine = locale === "en"
    ? (isNutritionOnly
        ? "Build today's nutrition plan. Account for body composition, weight trend, lifestyle, and prior days' meal pattern."
        : "Build today's nutrition plan. Account for training intensity, body composition, weight trend, and prior days' meal pattern.")
    : (isNutritionOnly
        ? "Bu gün için beslenme programı oluştur. Vücut kompozisyonunu, kilo trendini, yaşam tarzını ve önceki günlerin öğün düzenini dikkate al."
        : "Bu gün için beslenme programı oluştur. Antrenman yoğunluğunu, vücut kompozisyonunu, kilo trendini ve önceki günlerin öğün düzenini dikkate al.");

  const currentMealsBlock = buildCurrentMealsBlock(locale, currentMeals);

  const base = `${supplementBlock}${targetsBlock}${currentMealsBlock}\n\n${mealContext}\n\n${taskLine}`;
  return appendUserNote(base, userNote);
}

// ─── Workout replacement prompt (full day) ──────────────────────────────────

export interface WorkoutReplacementPromptInput {
  locale: Locale;
  userContext: string;
  workoutContext: string;
  planType: string | null;
  mode: "Replacement" | "Generation";
  userNote: string | null;
}

export function buildWorkoutReplacementPrompt(input: WorkoutReplacementPromptInput): string {
  const { locale, userContext, workoutContext, planType, mode, userNote } = input;
  const base = locale === "en"
    ? `${userContext}\n\n${workoutContext}\n\nToday's planType: "${planType ?? "workout"}" — use only sections allowed for this planType.\nMode: ${mode}\n\n${mode === "Replacement" ? "Rebuild today's workout and apply" : "Build today's workout from scratch; apply"} progressive overload vs previous weeks: more volume, harder movements, or new variations. Target the same muscle groups but ensure progression.`
    : `${userContext}\n\n${workoutContext}\n\nBugünün planType: "${planType ?? "workout"}" — sadece bu planType için izin verilen section'ları kullan.\nMod: ${mode}\n\nBu günün antrenman programını ${mode === "Replacement" ? "yeniden oluştur ve" : "sıfırdan oluştur;"} önceki haftalara göre progresif yüklenme uygula: daha fazla hacim, daha zorlu hareketler, veya yeni varyasyonlar ekle. Aynı kas grubunu hedefle ama gelişim sağla.`;
  return appendUserNote(base, userNote);
}

// ─── Section replacement prompt ─────────────────────────────────────────────

export interface SectionReplacementPromptInput {
  locale: Locale;
  userContext: string;
  slimContext: string;
  planType: string | null;
  section: string;
  sectionLabel: string;
  userNote: string | null;
}

export function buildSectionReplacementPrompt(input: SectionReplacementPromptInput): string {
  const { locale, userContext, slimContext, planType, section, sectionLabel, userNote } = input;
  const base = locale === "en"
    ? `${userContext}\n\n${slimContext}\n\nToday's planType: "${planType ?? "workout"}" — use only sections allowed for this planType.\n\nBuild new exercises for the "${sectionLabel}" section only. ALL exercises must have section="${section}", sectionLabel="${sectionLabel}" — DO NOT return another section. Apply progressive overload vs previous weeks.`
    : `${userContext}\n\n${slimContext}\n\nBugünün planType: "${planType ?? "workout"}" — sadece bu planType için izin verilen section'ları kullan.\n\nSadece "${sectionLabel}" bölümü için yeni egzersizler oluştur. TÜM egzersizler section="${section}", sectionLabel="${sectionLabel}" olmalı — başka section DÖNDÜRME. Önceki haftalara göre progresif yüklenme uygula.`;
  return appendUserNote(base, userNote);
}

// ─── Exercise variation prompt ──────────────────────────────────────────────

export interface ExerciseVariationPromptInput {
  locale: Locale;
  userContext: string;
  alternativesContext: string;
  exerciseDetail: string;
  userNote: string | null;
}

export function buildExerciseVariationPrompt(input: ExerciseVariationPromptInput): string {
  const { locale, userContext, alternativesContext, exerciseDetail, userNote } = input;
  const base = locale === "en"
    ? `${userContext}\n\n${alternativesContext}\n\nSuggest 3 different alternatives for the "${exerciseDetail}" exercise.`
    : `${userContext}\n\n${alternativesContext}\n\n"${exerciseDetail}" egzersizi yerine 3 farklı alternatif egzersiz öner.`;
  return appendUserNote(base, userNote);
}
