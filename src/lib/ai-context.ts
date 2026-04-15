import { db } from "@/db";
import { users, weeklyPlans, progressLogs } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

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
      healthNotes: users.healthNotes,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return "";

  const lines: string[] = [];

  // User profile
  const parts: string[] = [];
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
