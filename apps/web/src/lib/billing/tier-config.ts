import type { AIFeature } from "@/lib/ai";

export type BillingTier = "pro" | "elite";
export type BillingInterval = "monthly" | "yearly";

export interface TierConfig {
  // AI daily-limit overrides. Features absent here fall back to the base
  // DAILY_LIMITS in ai.ts — so Pro intentionally keeps an empty map.
  aiLimits: Partial<Record<AIFeature, number>>;
  // Max users a weekly plan can be shared with.
  maxShares: number;
  prioritySupport: boolean;
  // How many days of historical data the UI surfaces.
  historyRetentionDays: number;
}

export const TIER_CONFIG: Record<BillingTier, TierConfig> = {
  pro: {
    aiLimits: {},
    maxShares: 1,
    prioritySupport: false,
    historyRetentionDays: 90,
  },
  elite: {
    aiLimits: {
      meal: 25,
      exercise: 40,
      analyze: 10,
      chat: 40,
      workout: 15,
      "daily-meal": 8,
      weekly: 6,
      "exercise-demo": 60,
      shopping: 12,
      "target-weight": 5,
      "macro-ai": 12,
      greeting: 2,
    },
    maxShares: 3,
    prioritySupport: true,
    historyRetentionDays: 365,
  },
};

// List prices. Currency is USD for Lemon Squeezy; iyzico converts/charges TRY
// using its own pricing plans keyed by the same tier+interval.
export const PRICING: Record<
  BillingTier,
  Record<BillingInterval, number>
> = {
  pro: { monthly: 12.99, yearly: 89.99 },
  elite: { monthly: 24.99, yearly: 199.0 },
};

export const TRIAL_DAYS = 14;

export function isBillingTier(value: unknown): value is BillingTier {
  return value === "pro" || value === "elite";
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "yearly";
}
