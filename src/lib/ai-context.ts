import { db } from "@/db";
import { users, weeklyPlans, dailyPlans, meals, progressLogs } from "@/db/schema";
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
    lines.push(`Günlük program: ${routineStr}`);
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
      .orderBy(asc(dailyPlans.dayOfWeek), asc(meals.sortOrder));

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

  // Latest progress
  const [latestLog] = await db
    .select({
      weight: progressLogs.weight,
      fatPercent: progressLogs.fatPercent,
      bmi: progressLogs.bmi,
      logDate: progressLogs.logDate,
    })
    .from(progressLogs)
    .where(eq(progressLogs.userId, userId))
    .orderBy(desc(progressLogs.logDate))
    .limit(1);

  if (latestLog) {
    const logParts: string[] = [];
    if (latestLog.weight) logParts.push(`${latestLog.weight}kg`);
    if (latestLog.fatPercent) logParts.push(`%${latestLog.fatPercent} yağ`);
    if (latestLog.bmi) logParts.push(`BMI ${latestLog.bmi}`);
    if (logParts.length > 0) {
      lines.push(`Son ölçüm (${latestLog.logDate}): ${logParts.join(", ")}`);
    }
  }

  const result = lines.join("\n");
  contextCache.set(userId, { text: result, timestamp: Date.now() });
  return result;
}
