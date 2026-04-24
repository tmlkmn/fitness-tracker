import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeEvent } from "@/lib/routine-constants";

const FITNESS_LABELS: Record<string, string> = {
  beginner: "Yeni başlayan",
  returning: "Ara vermiş, tekrar başlayan",
  intermediate: "Orta düzey",
  advanced: "İleri düzey",
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
  sportHistory: string | null;
  currentMedications: string | null;
  serviceType: string | null;
  supplementSchedule: unknown;
}

/**
 * Renders the static profile block used by both user-context and weekly-plan
 * context builders. Callers still query their own dynamic data (trends,
 * current phase, water/sleep, meals) — only the profile is shared.
 *
 * Pass `options.includeAgeAllergens = true` for buildUserContext-style block
 * (age and food allergens included). Pass `includeAgeAllergens = false` for
 * weekly-plan style (skips these — weekly builder never used them).
 */
export function renderUserProfileLines(
  user: UserProfileRow,
  options: { includeAgeAllergens: boolean; compact: boolean },
): string[] {
  const lines: string[] = [];
  const { includeAgeAllergens, compact } = options;

  const header = compact ? "═══ KULLANICI PROFİLİ ═══" : null;
  if (header) lines.push(header);

  const parts: string[] = [];
  if (includeAgeAllergens && user.age) parts.push(`Yaş: ${user.age}`);
  if (user.height) parts.push(`Boy: ${user.height}cm`);
  if (user.weight) parts.push(`Başlangıç kilo: ${user.weight}kg`);
  if (user.targetWeight) parts.push(`Hedef: ${user.targetWeight}kg`);
  if (parts.length > 0) {
    lines.push(compact ? parts.join(" | ") : `Kullanıcı: ${parts.join(", ")}`);
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

  if (includeAgeAllergens && user.foodAllergens) {
    try {
      const allergens = JSON.parse(user.foodAllergens);
      if (Array.isArray(allergens) && allergens.length > 0 && allergens[0] !== "Yok") {
        lines.push(`⚠️ GIDA ALERJİLERİ (KESİNLİKLE KULLANMA): ${allergens.join(", ")}`);
      }
    } catch {
      lines.push(`⚠️ GIDA ALERJİLERİ: ${user.foodAllergens}`);
    }
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

  if (user.sportHistory) {
    lines.push(`Spor geçmişi: ${user.sportHistory}`);
  }

  if (user.currentMedications) {
    lines.push(`İlaçlar/supplementler: ${user.currentMedications}`);
  }

  if (includeAgeAllergens && user.serviceType) {
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
      sportHistory: users.sportHistory,
      currentMedications: users.currentMedications,
      serviceType: users.serviceType,
      supplementSchedule: users.supplementSchedule,
    })
    .from(users)
    .where(eq(users.id, userId));

  return user ?? null;
}
