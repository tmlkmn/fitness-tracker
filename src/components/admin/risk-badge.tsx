"use client";

import { useTranslations } from "next-intl";
import {
  CalendarClock,
  Moon,
  TrendingDown,
  MessageSquare,
} from "lucide-react";
import type { RiskTag, AtRiskUser } from "@/actions/admin-operations-types";

const RISK_STYLES: Record<RiskTag, { className: string; icon: typeof Moon }> = {
  expiring: {
    className: "text-red-300 bg-red-500/15",
    icon: CalendarClock,
  },
  pending_feedback: {
    className: "text-amber-300 bg-amber-500/15",
    icon: MessageSquare,
  },
  inactive: {
    className: "text-blue-300 bg-blue-500/15",
    icon: Moon,
  },
  low_compliance: {
    className: "text-orange-300 bg-orange-500/15",
    icon: TrendingDown,
  },
};

export function RiskBadge({
  risk,
  user,
}: {
  risk: RiskTag;
  user: AtRiskUser;
}) {
  const t = useTranslations("admin.atRisk.reasons");
  const cfg = RISK_STYLES[risk];
  const Icon = cfg.icon;

  let label = "";
  if (risk === "expiring") {
    const d = user.daysUntilExpiry ?? 0;
    label = d <= 0 ? t("expiringToday") : t("expiringIn", { days: d });
  } else if (risk === "inactive") {
    const d = user.daysSinceActive;
    label = d == null ? t("neverActive") : t("daysInactive", { days: d });
  } else if (risk === "low_compliance") {
    const pct = Math.round((user.complianceRatio ?? 0) * 100);
    label = t("complianceBelow", { pct });
  } else if (risk === "pending_feedback") {
    const d = user.oldestOpenFeedbackDays ?? 0;
    label = t("feedbackOpenFor", { days: d });
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.className}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}
