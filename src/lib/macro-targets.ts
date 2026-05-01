import { db } from "@/db";
import { progressLogs } from "@/db/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import {
  deriveGoalFallback,
  isFitnessGoal,
  type FitnessGoal,
} from "@/lib/meal-timing";
import { GOAL_STRATEGIES } from "@/lib/strategy/goal-strategy";

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type Gender = "male" | "female" | "prefer_not_to_say";
export type DailyActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active";

export interface UserBasics {
  weight?: string | number | null;
  height?: number | null;
  age?: number | null;
  gender?: string | null;
  dailyActivityLevel?: string | null;
  fitnessGoal?: string | null;
  targetWeight?: string | number | null;
  serviceType?: string | null;
}

export interface UserWithTargets extends UserBasics {
  targetCalories?: number | null;
  targetProteinG?: string | null;
  targetCarbsG?: string | null;
  targetFatG?: string | null;
}

// Mifflin-St Jeor sex-aware constant. prefer_not_to_say uses the midpoint
// (-78) so users who decline still get a non-zero estimate.
const BMR_SEX_CONSTANT: Record<Gender, number> = {
  male: 5,
  female: -161,
  prefer_not_to_say: -78,
};

// TDEE multiplier from user.dailyActivityLevel (NOT fitnessLevel — fitness
// level is workout experience, daily activity is non-exercise movement).
const ACTIVITY_MULTIPLIER: Record<DailyActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};
const DEFAULT_ACTIVITY: DailyActivityLevel = "moderate";

// LBM as a fraction of total body weight when measured body-fat % is
// missing or implausible. Population averages: male ~15% BF (LBM ~85%),
// female ~25% BF (~75%); midpoint 0.80 for unspecified.
const LBM_FRACTION_FALLBACK: Record<Gender, number> = {
  male: 0.85,
  female: 0.75,
  prefer_not_to_say: 0.8,
};

// Safety guards for stored body-fat readings (BIA scales sometimes return
// 0/100/NaN). Anything outside this range is treated as missing.
const FAT_PERCENT_MIN = 5;
const FAT_PERCENT_MAX = 60;
const MIN_DAILY_CALORIES = 1200;

function safeParseFloat(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGender(g: string | null | undefined): Gender {
  if (g === "male" || g === "female") return g;
  return "prefer_not_to_say";
}

function normalizeActivity(level: string | null | undefined): DailyActivityLevel {
  if (
    level === "sedentary" ||
    level === "light" ||
    level === "moderate" ||
    level === "very_active"
  ) {
    return level;
  }
  return DEFAULT_ACTIVITY;
}

function resolveGoal(user: UserBasics): FitnessGoal {
  if (isFitnessGoal(user.fitnessGoal)) return user.fitnessGoal;
  const w = safeParseFloat(user.weight);
  const tw = safeParseFloat(user.targetWeight);
  return deriveGoalFallback(w, tw, user.serviceType ?? null);
}

async function fetchLatestFatPercent(userId: string): Promise<number | null> {
  const rows = await db
    .select({ fatPercent: progressLogs.fatPercent })
    .from(progressLogs)
    .where(
      and(
        eq(progressLogs.userId, userId),
        isNotNull(progressLogs.fatPercent),
      ),
    )
    .orderBy(desc(progressLogs.logDate))
    .limit(1);

  const fp = rows[0] ? safeParseFloat(rows[0].fatPercent) : null;
  if (fp == null) return null;
  if (fp < FAT_PERCENT_MIN || fp > FAT_PERCENT_MAX) return null;
  return fp;
}

function computeLeanMass(weightKg: number, fatPercent: number | null, gender: Gender): number {
  if (fatPercent != null) return weightKg * (1 - fatPercent / 100);
  return weightKg * LBM_FRACTION_FALLBACK[gender];
}

export async function computeDefaultTargets(
  user: UserBasics,
  userId: string | null,
): Promise<MacroTargets | null> {
  const w = safeParseFloat(user.weight);
  const h = user.height ?? null;
  const age = user.age ?? null;
  if (!w || !h || !age) return null;

  const gender = normalizeGender(user.gender);
  const activity = ACTIVITY_MULTIPLIER[normalizeActivity(user.dailyActivityLevel)];
  const goal = resolveGoal(user);
  const strategy = GOAL_STRATEGIES[goal];

  // Mifflin-St Jeor (sex-aware)
  const bmr = 10 * w + 6.25 * h - 5 * age + BMR_SEX_CONSTANT[gender];
  const tdee = bmr * activity;
  const calories = Math.max(
    MIN_DAILY_CALORIES,
    Math.round(tdee + strategy.calorieDelta),
  );

  // LBM: prefer measured fatPercent, else gender-based fallback
  const fatPercent = userId ? await fetchLatestFatPercent(userId) : null;
  const lbm = computeLeanMass(w, fatPercent, gender);

  const protein = Math.round(lbm * strategy.proteinPerKgLBM);
  const fat = Math.round((calories * strategy.fatPctOfCalories) / 9);
  const carbsRaw = Math.round((calories - protein * 4 - fat * 9) / 4);
  const carbs = Math.max(strategy.minCarbsG[gender], carbsRaw);

  // minCarbsG bumpu veya rounding farkları makro toplamını calorie hedefinin
  // üzerine çıkarabilir (özellikle MIN_DAILY_CALORIES devreye girince).
  // Dönen calories değerini gerçek makro toplamına göre güncelle.
  const actualCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  const finalCalories = Math.max(calories, actualCalories);

  return { calories: finalCalories, protein, carbs, fat };
}

export async function resolveTargets(
  user: UserWithTargets,
  userId: string | null,
): Promise<MacroTargets | null> {
  const hasOverride =
    user.targetCalories != null ||
    user.targetProteinG != null ||
    user.targetCarbsG != null ||
    user.targetFatG != null;

  const defaults = await computeDefaultTargets(user, userId);

  if (!hasOverride) return defaults;

  const overrideProtein = safeParseFloat(user.targetProteinG);
  const overrideCarbs = safeParseFloat(user.targetCarbsG);
  const overrideFat = safeParseFloat(user.targetFatG);

  const calories = user.targetCalories ?? defaults?.calories ?? null;
  const protein = overrideProtein != null ? Math.round(overrideProtein) : defaults?.protein ?? null;
  const carbs = overrideCarbs != null ? Math.round(overrideCarbs) : defaults?.carbs ?? null;
  const fat = overrideFat != null ? Math.round(overrideFat) : defaults?.fat ?? null;

  // Dört alanın tamamı belirlenemiyorsa (kısmi override + eksik profil) null dön;
  // "0g hedef" ile "hedef bilinmiyor" ayrımını korur.
  if (calories == null || protein == null || carbs == null || fat == null) {
    return null;
  }

  return { calories, protein, carbs, fat };
}

export function macroProgressColor(actual: number, target: number): string {
  if (target <= 0) return "bg-muted-foreground/40";
  const pct = (actual / target) * 100;
  if (pct < 90) return "bg-amber-500";
  if (pct <= 110) return "bg-primary";
  return "bg-destructive";
}
