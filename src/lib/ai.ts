import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { aiUsageLogs } from "@/db/schema";
import { eq, and, gte, sql, inArray } from "drizzle-orm";

export type AiUsageStatus =
  | "success"
  | "success_with_warnings"
  | "parse_error"
  | "timeout"
  | "api_error"
  | "rate_limited"
  | "validation_error";

// Statuses that consumed compute and produced a usable result. Both must
// count toward rate limit (otherwise users could spam slightly-flawed
// generations for free).
const SUCCESS_LIKE_STATUSES = ["success", "success_with_warnings"] as const;

export interface LogAiUsageOptions {
  status?: AiUsageStatus;
  errorMessage?: string;
  inputTokens?: number;
  outputTokens?: number;
  durationMs?: number;
  model?: string;
  promptVersion?: string;
  estCostUsd?: number;
}

export const PROMPT_VERSION = process.env.GIT_SHA ?? "unknown";

/**
 * Standard priority block injected at the END of user messages. Tells the
 * model that user-supplied notes outrank system rules but never override
 * safety constraints (allergens, IF contraindications, etc.).
 */
export function buildUserNotePriorityBlock(userNote: string): string {
  return `\n\n═══ ÖNCELİK SIRASI ═══
1. SAĞLIK GÜVENLİĞİ — Alerjiler, sağlık kısıtları, IF kontrendikasyonları (asla ihlal edilemez)
2. KULLANICI İSTEĞİ (aşağıda) — diğer tüm kurallardan ÜSTÜNDÜR (madde 1 hariç)
3. Sistem kuralları — politikalar, makro hedefleri, çeşitlilik

═══ KULLANICI İSTEĞİ ═══
${userNote.trim()}`;
}

/**
 * Classify a thrown error into a stable AI usage status. AbortErrors and
 * messages mentioning "abort"/"timeout" become "timeout"; SyntaxErrors and
 * messages mentioning JSON/validation become "parse_error"; everything else
 * is "api_error".
 */
export function discriminateAiError(error: unknown): {
  status: "timeout" | "parse_error" | "api_error";
  errorMessage: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lower = errorMessage.toLowerCase();
  let status: "timeout" | "parse_error" | "api_error" = "api_error";
  if (
    (error instanceof Error && error.name === "AbortError") ||
    lower.includes("aborted") ||
    lower.includes("timeout")
  ) {
    status = "timeout";
  } else if (
    error instanceof SyntaxError ||
    lower.includes("json") ||
    lower.includes("invalid response format")
  ) {
    status = "parse_error";
  }
  return { status, errorMessage: errorMessage.slice(0, 500) };
}

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
export type AIFeature = "meal" | "exercise" | "analyze" | "chat" | "workout" | "daily-meal" | "weekly" | "exercise-demo" | "shopping" | "target-weight";

const DAILY_LIMITS: Record<AIFeature, number> = {
  meal: 10,
  exercise: 15,
  analyze: 3,
  chat: 15,
  workout: 5,
  "daily-meal": 3,
  weekly: 2,
  "exercise-demo": 30,
  shopping: 5,
  "target-weight": 2,
} as const;

// Cooldown (seconds) — prevents rapid-fire expensive requests
const COOLDOWNS: Partial<Record<AIFeature, number>> = {
  weekly: 120,
  "daily-meal": 30,
  workout: 30,
  shopping: 30,
  "target-weight": 60,
};

function getStartOfDay(): Date {
  // Use Turkey timezone (Europe/Istanbul, UTC+3) for daily reset
  const nowUtc = new Date();
  const turkeyOffset = 3 * 60 * 60 * 1000; // UTC+3
  const turkeyNow = new Date(nowUtc.getTime() + turkeyOffset);
  const start = new Date(
    Date.UTC(turkeyNow.getUTCFullYear(), turkeyNow.getUTCMonth(), turkeyNow.getUTCDate()) - turkeyOffset
  );
  return start;
}

export async function checkRateLimit(userId: string, feature: AIFeature): Promise<void> {
  const limit = DAILY_LIMITS[feature];
  const startOfDay = getStartOfDay();

  // Check cooldown first — only "success" calls count toward cooldown so a
  // failed call doesn't lock the user out of retrying.
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
          inArray(aiUsageLogs.status, SUCCESS_LIKE_STATUSES as unknown as string[]),
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

  // Check daily limit — same: only successful calls consume quota.
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiUsageLogs)
    .where(
      and(
        eq(aiUsageLogs.userId, userId),
        eq(aiUsageLogs.feature, feature),
        eq(aiUsageLogs.status, "success"),
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
        eq(aiUsageLogs.status, "success"),
        gte(aiUsageLogs.createdAt, startOfDay),
      ),
    );

  return { remaining: Math.max(0, limit - (row?.count ?? 0)), limit };
}

export async function logAiUsage(
  userId: string,
  feature: AIFeature,
  options?: LogAiUsageOptions,
): Promise<void> {
  try {
    await db.insert(aiUsageLogs).values({
      userId,
      feature,
      status: options?.status ?? "success",
      errorMessage: options?.errorMessage ?? null,
      inputTokens: options?.inputTokens ?? null,
      outputTokens: options?.outputTokens ?? null,
      durationMs: options?.durationMs ?? null,
      model: options?.model ?? null,
      promptVersion: options?.promptVersion ?? null,
      estCostUsd: options?.estCostUsd != null ? String(options.estCostUsd) : null,
    });
  } catch {
    // silent — logging should not break features
  }
}
