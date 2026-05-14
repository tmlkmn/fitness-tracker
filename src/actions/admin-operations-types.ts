import type { UserWithStatus } from "./admin";

export type RiskTag =
  | "expiring"
  | "inactive"
  | "low_compliance"
  | "pending_feedback";

export interface AtRiskUser {
  user: UserWithStatus;
  risks: RiskTag[];
  lastActiveAt: Date | null;
  daysSinceActive: number | null;
  complianceRatio: number | null;
  complianceItems: number;
  daysUntilExpiry: number | null;
  oldestOpenFeedbackDays: number | null;
}

export interface AdminKpiSummary {
  activeUsers: number;
  aiCostTodayUsd: number;
  aiCostWeekUsd: number;
  newUsersThisWeek: number;
  openFeedback: number;
  expiringWithin7d: number;
}

export const RISK_PRIORITY: Record<RiskTag, number> = {
  expiring: 4,
  pending_feedback: 3,
  inactive: 2,
  low_compliance: 1,
};
