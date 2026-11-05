import { db } from "@/db";
import { progressLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Renders the recent body composition trend (weight / fat / waist / muscle
 * distribution) as a list of lines suitable for an AI prompt. Used by
 * buildMealContext, buildWeeklyPlanContext, and buildUserContext to share
 * one canonical render — drift between callers caused subtle differences in
 * what the AI saw for the same user.
 */
export async function loadRecentProgressLines(
  userId: string,
  options: { limit?: number; includeMuscleDistribution?: boolean; emptyState?: boolean } = {},
): Promise<string[]> {
  const { limit = 5, includeMuscleDistribution = true, emptyState = false } = options;

  const recentLogs = await db
    .select({
      logDate: progressLogs.logDate,
      weight: progressLogs.weight,
      fatPercent: progressLogs.fatPercent,
      fatKg: progressLogs.fatKg,
      fluidPercent: progressLogs.fluidPercent,
      bmi: progressLogs.bmi,
      waistCm: progressLogs.waistCm,
      torsoFatPercent: progressLogs.torsoFatPercent,
      torsoMuscleKg: progressLogs.torsoMuscleKg,
      leftArmMuscleKg: progressLogs.leftArmMuscleKg,
      rightArmMuscleKg: progressLogs.rightArmMuscleKg,
      leftLegMuscleKg: progressLogs.leftLegMuscleKg,
      rightLegMuscleKg: progressLogs.rightLegMuscleKg,
    })
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate))
    .limit(limit);

  if (recentLogs.length === 0) {
    if (!emptyState) return [];
    return [
      "═══ VÜCUT KOMPOZİSYONU ÖLÇÜMÜ ═══",
      "⚠️ Kullanıcı henüz ölçüm girmemiş — programı SADECE hedef + profil verilerine göre kur.",
      "Belirsiz alanlarda muhafazakar varsayım yap; agresif kalori deltası veya yüksek hacim uygulama.",
    ];
  }

  const lines: string[] = [];
  lines.push("═══ VÜCUT KOMPOZİSYONU İLERLEME (Son Ölçümler) ═══");

  // chronological order for AI readability
  for (const log of [...recentLogs].reverse()) {
    const parts: string[] = [`${log.logDate}:`];
    if (log.weight) parts.push(`${log.weight}kg`);
    if (log.fatPercent) parts.push(`%${log.fatPercent} yağ`);
    if (log.fatKg) parts.push(`${log.fatKg}kg yağ`);
    if (log.bmi) parts.push(`BMI ${log.bmi}`);
    if (log.fluidPercent) parts.push(`%${log.fluidPercent} sıvı`);
    if (log.waistCm) parts.push(`bel: ${log.waistCm}cm`);
    lines.push(parts.join(" | "));
  }

  const latest = recentLogs[0];

  if (includeMuscleDistribution) {
    const muscleParts: string[] = [];
    if (latest.torsoMuscleKg) muscleParts.push(`Gövde: ${latest.torsoMuscleKg}kg`);
    if (latest.leftArmMuscleKg) muscleParts.push(`Sol kol: ${latest.leftArmMuscleKg}kg`);
    if (latest.rightArmMuscleKg) muscleParts.push(`Sağ kol: ${latest.rightArmMuscleKg}kg`);
    if (latest.leftLegMuscleKg) muscleParts.push(`Sol bacak: ${latest.leftLegMuscleKg}kg`);
    if (latest.rightLegMuscleKg) muscleParts.push(`Sağ bacak: ${latest.rightLegMuscleKg}kg`);
    if (muscleParts.length > 0) {
      lines.push(`Kas dağılımı (son): ${muscleParts.join(" | ")}`);
    }

    if (latest.torsoFatPercent) {
      lines.push(`Gövde yağ oranı: %${latest.torsoFatPercent}`);
    }
  }

  // Weight trend (oldest → latest in the window)
  if (recentLogs.length >= 2) {
    const oldest = recentLogs[recentLogs.length - 1];
    if (oldest.weight && latest.weight) {
      const diff = parseFloat(String(latest.weight)) - parseFloat(String(oldest.weight));
      const direction = diff > 0 ? "artış" : diff < 0 ? "düşüş" : "sabit";
      lines.push(
        `Kilo trendi: ${Math.abs(diff).toFixed(1)}kg ${direction} (${oldest.logDate} → ${latest.logDate})`,
      );
    }
  }

  return lines;
}
