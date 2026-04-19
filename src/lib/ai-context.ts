import { db } from "@/db";
import { users, weeklyPlans, dailyPlans, meals, progressLogs, waterLogs, sleepLogs } from "@/db/schema";
import { eq, desc, and, gte, lte, asc } from "drizzle-orm";

// 5-minute TTL memory cache for user context
const contextCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function buildUserContext(userId: string): Promise<string> {
  const cached = contextCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.text;
  }
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
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return "";

  const lines: string[] = [];

  // User profile
  const parts: string[] = [];
  if (user.age) parts.push(`Yaş: ${user.age}`);
  if (user.height) parts.push(`Boy: ${user.height}cm`);
  if (user.weight) parts.push(`Başlangıç kilo: ${user.weight}kg`);
  if (user.targetWeight) parts.push(`Hedef: ${user.targetWeight}kg`);
  if (parts.length > 0) lines.push(`Kullanıcı: ${parts.join(", ")}`);

  // Health notes
  if (user.healthNotes) {
    try {
      const notes = JSON.parse(user.healthNotes);
      if (Array.isArray(notes) && notes.length > 0) {
        lines.push(`Sağlık notları: ${notes.join(". ")}`);
      }
    } catch {
      lines.push(`Sağlık notları: ${user.healthNotes}`);
    }
  }

  // Food allergens
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

  // Daily routine
  if (user.dailyRoutine && Array.isArray(user.dailyRoutine) && user.dailyRoutine.length > 0) {
    const routineStr = (user.dailyRoutine as { time: string; event: string }[])
      .map((r) => `${r.time} ${r.event}`)
      .join(", ");
    const hasWeekend = user.weekendRoutine && Array.isArray(user.weekendRoutine) && user.weekendRoutine.length > 0;
    lines.push(`${hasWeekend ? "Hafta içi programı" : "Günlük program"}: ${routineStr}`);
  }

  // Weekend routine
  if (user.weekendRoutine && Array.isArray(user.weekendRoutine) && user.weekendRoutine.length > 0) {
    const routineStr = (user.weekendRoutine as { time: string; event: string }[])
      .map((r) => `${r.time} ${r.event}`)
      .join(", ");
    lines.push(`Hafta sonu programı: ${routineStr}`);
  }

  // Fitness level
  const fitnessLabels: Record<string, string> = {
    beginner: "Yeni başlayan",
    returning: "Ara vermiş, tekrar başlayan",
    intermediate: "Orta düzey",
    advanced: "İleri düzey",
  };
  if (user.fitnessLevel) {
    lines.push(`Fitness seviyesi: ${fitnessLabels[user.fitnessLevel] ?? user.fitnessLevel}`);
  }

  // Sport history
  if (user.sportHistory) {
    lines.push(`Spor geçmişi: ${user.sportHistory}`);
  }

  // Medications
  if (user.currentMedications) {
    lines.push(`İlaçlar/supplementler: ${user.currentMedications}`);
  }

  // Service type
  lines.push(`Hizmet tipi: ${user.serviceType === "nutrition" ? "Sadece Beslenme" : "Tam Program (Antrenman + Beslenme)"}`);

  // Current phase
  const today = new Date().toISOString().split("T")[0];
  const [currentWeek] = await db
    .select({
      weekNumber: weeklyPlans.weekNumber,
      phase: weeklyPlans.phase,
      title: weeklyPlans.title,
    })
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.userId, userId),
        gte(weeklyPlans.startDate, today)
      )
    )
    .orderBy(weeklyPlans.startDate)
    .limit(1);

  if (currentWeek) {
    lines.push(
      `Program: Hafta ${currentWeek.weekNumber}, ${currentWeek.phase} fazı (${currentWeek.title})`
    );
  }

  // Weekly meal plan for the current week (startDate <= today, most recent)
  const [activeWeek] = await db
    .select({ id: weeklyPlans.id })
    .from(weeklyPlans)
    .where(
      and(
        eq(weeklyPlans.userId, userId),
        lte(weeklyPlans.startDate, today)
      )
    )
    .orderBy(desc(weeklyPlans.startDate))
    .limit(1);

  if (activeWeek) {
    const weekMeals = await db
      .select({
        dayName: dailyPlans.dayName,
        planType: dailyPlans.planType,
        mealLabel: meals.mealLabel,
        content: meals.content,
        calories: meals.calories,
      })
      .from(meals)
      .innerJoin(dailyPlans, eq(meals.dailyPlanId, dailyPlans.id))
      .where(eq(dailyPlans.weeklyPlanId, activeWeek.id))
      .orderBy(asc(dailyPlans.dayOfWeek), asc(meals.mealTime));

    if (weekMeals.length > 0) {
      const byDay = new Map<string, string[]>();
      for (const m of weekMeals) {
        const key = `${m.dayName} (${m.planType})`;
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(`${m.mealLabel}: ${m.content} (${m.calories} kcal)`);
      }
      const mealLines: string[] = [];
      for (const [day, dayMeals] of byDay) {
        mealLines.push(`${day}: ${dayMeals.join(" | ")}`);
      }
      lines.push(`\nMevcut haftalık beslenme planı:\n${mealLines.join("\n")}`);
    }
  }

  // Latest progress (last 2 for trend comparison)
  const recentLogs = await db
    .select({
      weight: progressLogs.weight,
      fatPercent: progressLogs.fatPercent,
      bmi: progressLogs.bmi,
      waistCm: progressLogs.waistCm,
      fatKg: progressLogs.fatKg,
      logDate: progressLogs.logDate,
    })
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate))
    .limit(2);

  if (recentLogs.length > 0) {
    const latest = recentLogs[0];
    const logParts: string[] = [];
    if (latest.weight) logParts.push(`${latest.weight}kg`);
    if (latest.fatPercent) logParts.push(`%${latest.fatPercent} yağ`);
    if (latest.bmi) logParts.push(`BMI ${latest.bmi}`);
    if (latest.waistCm) logParts.push(`Bel ${latest.waistCm}cm`);
    if (logParts.length > 0) {
      lines.push(`Son ölçüm (${latest.logDate}): ${logParts.join(", ")}`);
    }

    // Trend comparison between last 2 measurements
    if (recentLogs.length === 2) {
      const prev = recentLogs[1];
      const trendParts: string[] = [];

      if (latest.weight && prev.weight) {
        const diff = parseFloat(String(latest.weight)) - parseFloat(String(prev.weight));
        trendParts.push(`Kilo: ${diff > 0 ? "+" : ""}${diff.toFixed(1)}kg`);
      }
      if (latest.fatPercent && prev.fatPercent) {
        const diff = parseFloat(String(latest.fatPercent)) - parseFloat(String(prev.fatPercent));
        trendParts.push(`Yağ: ${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`);
      }
      if (latest.waistCm && prev.waistCm) {
        const diff = parseFloat(String(latest.waistCm)) - parseFloat(String(prev.waistCm));
        trendParts.push(`Bel: ${diff > 0 ? "+" : ""}${diff.toFixed(1)}cm`);
      }

      if (trendParts.length > 0) {
        lines.push(`Trend (${prev.logDate} → ${latest.logDate}): ${trendParts.join(", ")}`);
      }
    }
  }

  // Water intake (last 7 days)
  const recentWater = await db
    .select({
      glasses: waterLogs.glasses,
      targetGlasses: waterLogs.targetGlasses,
    })
    .from(waterLogs)
    .where(eq(waterLogs.userId, userId))
    .orderBy(desc(waterLogs.logDate))
    .limit(7);

  if (recentWater.length > 0) {
    const avgGlasses = (recentWater.reduce((s, w) => s + w.glasses, 0) / recentWater.length).toFixed(1);
    const avgTarget = Math.round(recentWater.reduce((s, w) => s + w.targetGlasses, 0) / recentWater.length);
    const avgLiters = (parseFloat(avgGlasses) * 0.25).toFixed(1);
    lines.push(`Su alımı (son ${recentWater.length} gün): Ort. ${avgGlasses} bardak/gün (hedef: ${avgTarget}, ${avgLiters}L/gün)`);
  }

  // Sleep (last 7 days)
  const recentSleep = await db
    .select({
      durationMinutes: sleepLogs.durationMinutes,
      quality: sleepLogs.quality,
    })
    .from(sleepLogs)
    .where(eq(sleepLogs.userId, userId))
    .orderBy(desc(sleepLogs.logDate))
    .limit(7);

  if (recentSleep.length > 0) {
    const validDurations = recentSleep.filter((s) => s.durationMinutes != null);
    const validQualities = recentSleep.filter((s) => s.quality != null);
    const parts: string[] = [];
    if (validDurations.length > 0) {
      const avgMin = Math.round(validDurations.reduce((s, sl) => s + sl.durationMinutes!, 0) / validDurations.length);
      const h = Math.floor(avgMin / 60);
      const m = avgMin % 60;
      parts.push(`Ort. ${h}sa ${m}dk`);
    }
    if (validQualities.length > 0) {
      const avgQ = (validQualities.reduce((s, sl) => s + sl.quality!, 0) / validQualities.length).toFixed(1);
      parts.push(`kalite: ${avgQ}/5`);
    }
    if (parts.length > 0) {
      lines.push(`Uyku (son ${recentSleep.length} gün): ${parts.join(", ")}`);
    }
  }

  const result = lines.join("\n");
  contextCache.set(userId, { text: result, timestamp: Date.now() });
  return result;
}
