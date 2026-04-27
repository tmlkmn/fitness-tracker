import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeEvent } from "@/lib/routine-constants";
import {
  deriveGoalFallback,
  isFitnessGoal,
  type FitnessGoal,
} from "@/lib/meal-timing";
import { renderGoalStrategyBlock } from "@/lib/strategy/goal-strategy";

const FITNESS_LABELS: Record<string, string> = {
  beginner: "Yeni başlayan",
  returning: "Ara vermiş, tekrar başlayan",
  intermediate: "Orta düzey",
  advanced: "İleri düzey",
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Çoğunlukla oturan",
  light: "Hafif aktif",
  moderate: "Ayakta çalışan",
  very_active: "Çok aktif (fiziksel iş)",
};

export interface UserProfileRow {
  height: number | null;
  weight: string | null;
  targetWeight: string | null;
  age: number | null;
  healthNotes: string | null;
  foodAllergens: string | null;
  dailyRoutine: unknown;
  weekendRoutine: unknown;
  fitnessLevel: string | null;
  fitnessGoal: string | null;
  sportHistory: string | null;
  currentMedications: string | null;
  serviceType: string | null;
  supplementSchedule: unknown;
  targetCalories: number | null;
  targetProteinG: string | null;
  targetCarbsG: string | null;
  targetFatG: string | null;
  gender: string | null;
  dailyActivityLevel: string | null;
  hasEatingDisorderHistory: boolean | null;
  isPregnantOrBreastfeeding: boolean | null;
  hasDiabetes: boolean | null;
  hasThyroidCondition: boolean | null;
}

/**
 * Renders the static profile block used by user-context, meal-context, and
 * weekly-plan context builders. Callers still query their own dynamic data
 * (trends, current phase, water/sleep, meals) — only the profile is shared.
 *
 * Food allergens are ALWAYS rendered (safety-critical — skipping them lets
 * the AI suggest allergen-containing meals). Age and service type are opt-in
 * via `includeAgeAndService` because they're not needed by every caller.
 */
export function renderUserProfileLines(
  user: UserProfileRow,
  options: { includeAgeAndService: boolean; compact: boolean },
): string[] {
  const lines: string[] = [];
  const { includeAgeAndService, compact } = options;

  const header = compact ? "═══ KULLANICI PROFİLİ ═══" : null;
  if (header) lines.push(header);

  const parts: string[] = [];
  if (includeAgeAndService && user.age) parts.push(`Yaş: ${user.age}`);
  if (user.height) parts.push(`Boy: ${user.height}cm`);
  if (user.weight) parts.push(`Başlangıç kilo: ${user.weight}kg`);
  if (user.targetWeight) parts.push(`Hedef: ${user.targetWeight}kg`);
  if (parts.length > 0) {
    lines.push(compact ? parts.join(" | ") : `Kullanıcı: ${parts.join(", ")}`);
  }

  // Gender — surfaced for AI calorie/protein math (Mifflin-St Jeor sex
  // constant, gender-based LBM fallback). "prefer_not_to_say" stays hidden
  // because the math falls back to the gender-neutral midpoint anyway.
  if (user.gender && user.gender !== "prefer_not_to_say") {
    lines.push(
      `Cinsiyet (kalori hesabı için): ${user.gender === "male" ? "Erkek" : "Kadın"}`,
    );
  }

  if (user.dailyActivityLevel) {
    lines.push(
      `Günlük aktivite: ${ACTIVITY_LABELS[user.dailyActivityLevel] ?? user.dailyActivityLevel}`,
    );
  }

  if (user.healthNotes) {
    try {
      const notes = JSON.parse(user.healthNotes);
      if (Array.isArray(notes) && notes.length > 0) {
        lines.push(`Sağlık notları${compact ? "/kısıtlamalar" : ""}: ${notes.join(". ")}`);
      }
    } catch {
      lines.push(`Sağlık notları: ${user.healthNotes}`);
    }
  }

  // Food allergens — safety-critical, ALWAYS rendered regardless of caller
  if (user.foodAllergens) {
    try {
      const allergens = JSON.parse(user.foodAllergens);
      if (Array.isArray(allergens) && allergens.length > 0 && allergens[0] !== "Yok") {
        lines.push(`⚠️ GIDA ALERJİLERİ (KESİNLİKLE KULLANMA): ${allergens.join(", ")}`);
      }
    } catch {
      lines.push(`⚠️ GIDA ALERJİLERİ: ${user.foodAllergens}`);
    }
  }

  // Health flags — safety-critical, render only the TRUE ones (false/null
  // are skipped to keep the prompt tight). These trigger IF contraindication
  // and conservative macro programming downstream.
  const healthFlags: string[] = [];
  if (user.hasEatingDisorderHistory) healthFlags.push("yeme bozukluğu öyküsü");
  if (user.isPregnantOrBreastfeeding) healthFlags.push("hamilelik/emzirme");
  if (user.hasDiabetes) healthFlags.push("diyabet");
  if (user.hasThyroidCondition) healthFlags.push("tiroid rahatsızlığı");
  if (healthFlags.length > 0) {
    lines.push(
      `⚠️ Sağlık durumları: ${healthFlags.join(", ")} (aralıklı açlık önerilmiyor, makro programı muhafazakar)`,
    );
  }

  // Manual macro targets — if user has set any, render them. These override
  // AI's own Mifflin-St Jeor estimates and must be honored in all meal plans.
  const targetParts: string[] = [];
  if (user.targetCalories) targetParts.push(`${user.targetCalories} kcal`);
  if (user.targetProteinG) targetParts.push(`${user.targetProteinG}g protein`);
  if (user.targetCarbsG) targetParts.push(`${user.targetCarbsG}g karb`);
  if (user.targetFatG) targetParts.push(`${user.targetFatG}g yağ`);
  if (targetParts.length > 0) {
    lines.push(
      `🎯 Kullanıcının belirlediği günlük hedefler: ${targetParts.join(", ")}. Beslenme önerilerinde bu hedefleri baz al.`,
    );
  }

  if (Array.isArray(user.dailyRoutine) && user.dailyRoutine.length > 0) {
    const routineStr = (user.dailyRoutine as { time: string; event: string }[])
      .map((r) => `${r.time} ${normalizeEvent(r.event)}`)
      .join(", ");
    const hasWeekend = Array.isArray(user.weekendRoutine) && user.weekendRoutine.length > 0;
    lines.push(`${hasWeekend ? "Hafta içi programı" : "Günlük program"}: ${routineStr}`);
  }

  if (Array.isArray(user.weekendRoutine) && user.weekendRoutine.length > 0) {
    const routineStr = (user.weekendRoutine as { time: string; event: string }[])
      .map((r) => `${r.time} ${normalizeEvent(r.event)}`)
      .join(", ");
    lines.push(`Hafta sonu programı: ${routineStr}`);
  }

  if (Array.isArray(user.supplementSchedule) && user.supplementSchedule.length > 0) {
    const suppStr = (user.supplementSchedule as { period: string; supplements: string }[])
      .map((s) => `${s.period}: ${s.supplements}`)
      .join("; ");
    lines.push(`Supplement takvimi: ${suppStr}`);
  }

  if (user.fitnessLevel) {
    lines.push(
      `Fitness seviyesi: ${FITNESS_LABELS[user.fitnessLevel] ?? user.fitnessLevel}`,
    );
  }

  // Goal + strategy block — single source of truth for calorie/protein/fat
  // policy. If user hasn't picked a goal explicitly, derive it from
  // weight/targetWeight delta and label the block as derived.
  let resolvedGoal: FitnessGoal | null = null;
  let goalSource: "explicit" | "derived" = "explicit";
  if (isFitnessGoal(user.fitnessGoal)) {
    resolvedGoal = user.fitnessGoal;
  } else if (user.weight || user.targetWeight) {
    const w = user.weight ? parseFloat(user.weight) : null;
    const tw = user.targetWeight ? parseFloat(user.targetWeight) : null;
    resolvedGoal = deriveGoalFallback(w, tw, user.serviceType);
    goalSource = "derived";
  }
  if (resolvedGoal) {
    lines.push(renderGoalStrategyBlock(resolvedGoal, goalSource));
  }

  if (user.sportHistory) {
    lines.push(`Spor geçmişi: ${user.sportHistory}`);
  }

  if (user.currentMedications) {
    lines.push(`İlaçlar/supplementler: ${user.currentMedications}`);
  }

  if (includeAgeAndService && user.serviceType) {
    lines.push(
      `Hizmet tipi: ${user.serviceType === "nutrition" ? "Sadece Beslenme" : "Tam Program (Antrenman + Beslenme)"}`,
    );
  }

  return lines;
}

export async function loadUserProfileRow(userId: string): Promise<UserProfileRow | null> {
  const [user] = await db
    .select({
      height: users.height,
      weight: users.weight,
      targetWeight: users.targetWeight,
      age: users.age,
      healthNotes: users.healthNotes,
      foodAllergens: users.foodAllergens,
      dailyRoutine: users.dailyRoutine,
      weekendRoutine: users.weekendRoutine,
      fitnessLevel: users.fitnessLevel,
      fitnessGoal: users.fitnessGoal,
      sportHistory: users.sportHistory,
      currentMedications: users.currentMedications,
      serviceType: users.serviceType,
      supplementSchedule: users.supplementSchedule,
      targetCalories: users.targetCalories,
      targetProteinG: users.targetProteinG,
      targetCarbsG: users.targetCarbsG,
      targetFatG: users.targetFatG,
      gender: users.gender,
      dailyActivityLevel: users.dailyActivityLevel,
      hasEatingDisorderHistory: users.hasEatingDisorderHistory,
      isPregnantOrBreastfeeding: users.isPregnantOrBreastfeeding,
      hasDiabetes: users.hasDiabetes,
      hasThyroidCondition: users.hasThyroidCondition,
    })
    .from(users)
    .where(eq(users.id, userId));

  return user ?? null;
}
