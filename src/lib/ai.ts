import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { aiUsageLogs } from "@/db/schema";

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
  chat: 20,
  workout: 10,
  "daily-meal": 5,
  weekly: 3,
  "exercise-demo": 30,
} as const;

// Map<userId, Map<feature, timestamps[]>>
const rateLimitMap = new Map<string, Map<AIFeature, number[]>>();

function getStartOfDay(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function checkRateLimit(userId: string, feature: AIFeature): void {
  const now = Date.now();
  const startOfDay = getStartOfDay();
  const limit = DAILY_LIMITS[feature];

  let userMap = rateLimitMap.get(userId);
  if (!userMap) {
    userMap = new Map();
    rateLimitMap.set(userId, userMap);
  }

  const timestamps = userMap.get(feature) ?? [];
  const todayHits = timestamps.filter((t) => t >= startOfDay);

  if (todayHits.length >= limit) {
    throw new Error("RATE_LIMITED");
  }

  todayHits.push(now);
  userMap.set(feature, todayHits);
}

export async function logAiUsage(userId: string, feature: AIFeature): Promise<void> {
  try {
    await db.insert(aiUsageLogs).values({ userId, feature });
  } catch {
    // silent — logging should not break features
  }
}
