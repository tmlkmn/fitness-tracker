import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { aiUsageLogs } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

let client: Anthropic | null = null;

export function getAIClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export const AI_MODELS = {
  fast: "claude-haiku-4-5",
  smart: "claude-sonnet-4-6",
} as const;

// Feature-based daily rate limits
export type AIFeature = "meal" | "exercise" | "analyze" | "chat" | "workout" | "daily-meal" | "weekly" | "exercise-demo";

const DAILY_LIMITS: Record<AIFeature, number> = {
  meal: 10,
  exercise: 15,
  analyze: 3,
  chat: 15,
  workout: 5,
  "daily-meal": 3,
  weekly: 2,
  "exercise-demo": 30,
} as const;

// Cooldown (seconds) — prevents rapid-fire expensive requests
const COOLDOWNS: Partial<Record<AIFeature, number>> = {
  weekly: 120,
  "daily-meal": 30,
  workout: 30,
};

function getStartOfDay(): Date {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return start;
}

export async function checkRateLimit(userId: string, feature: AIFeature): Promise<void> {
  const limit = DAILY_LIMITS[feature];
  const startOfDay = getStartOfDay();

  // Check cooldown first
  const cooldownSecs = COOLDOWNS[feature];
  if (cooldownSecs) {
    const cutoff = new Date(Date.now() - cooldownSecs * 1000);
    const [recent] = await db
      .select({ lastUsed: sql<Date>`max(${aiUsageLogs.createdAt})` })
      .from(aiUsageLogs)
      .where(
        and(
          eq(aiUsageLogs.userId, userId),
          eq(aiUsageLogs.feature, feature),
          gte(aiUsageLogs.createdAt, cutoff),
        ),
      );
    if (recent?.lastUsed) {
      const elapsed = (Date.now() - new Date(recent.lastUsed).getTime()) / 1000;
      const remaining = Math.ceil(cooldownSecs - elapsed);
      if (remaining > 0) {
        throw new Error(`COOLDOWN:${remaining}`);
      }
    }
  }

  // Check daily limit
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsageLogs)
    .where(
      and(
        eq(aiUsageLogs.userId, userId),
        eq(aiUsageLogs.feature, feature),
        gte(aiUsageLogs.createdAt, startOfDay),
      ),
    );

  if ((row?.count ?? 0) >= limit) {
    throw new Error("RATE_LIMITED");
  }
}

export async function getRemainingQuota(
  userId: string,
  feature: AIFeature,
): Promise<{ remaining: number; limit: number }> {
  const limit = DAILY_LIMITS[feature];
  const startOfDay = getStartOfDay();

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsageLogs)
    .where(
      and(
        eq(aiUsageLogs.userId, userId),
        eq(aiUsageLogs.feature, feature),
        gte(aiUsageLogs.createdAt, startOfDay),
      ),
    );

  return { remaining: Math.max(0, limit - (row?.count ?? 0)), limit };
}

export async function logAiUsage(userId: string, feature: AIFeature): Promise<void> {
  try {
    await db.insert(aiUsageLogs).values({ userId, feature });
  } catch {
    // silent — logging should not break features
  }
}
