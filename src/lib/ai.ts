import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAIClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export const AI_MODELS = {
  fast: "claude-haiku-4-5-20251001",
  smart: "claude-sonnet-4-20250514",
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
