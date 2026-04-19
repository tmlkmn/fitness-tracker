"use server";

import { getAuthUser } from "@/lib/auth-utils";
import { getRemainingQuota, type AIFeature } from "@/lib/ai";

export type AiQuotas = Record<AIFeature, { remaining: number; limit: number }>;

const FEATURES: AIFeature[] = [
  "meal", "exercise", "analyze", "chat",
  "workout", "daily-meal", "weekly", "exercise-demo",
  "target-weight",
];

export async function getAiQuotas(): Promise<AiQuotas> {
  const user = await getAuthUser();
  const result: Record<string, { remaining: number; limit: number }> = {};
  for (const f of FEATURES) {
    result[f] = await getRemainingQuota(user.id, f);
  }
  return result as AiQuotas;
}
