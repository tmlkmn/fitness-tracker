"use client";

import { useTranslations } from "next-intl";
import {
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  Snowflake,
} from "lucide-react";
import type { MembershipType } from "@/actions/admin";

export const MEMBERSHIP_KEYS = [
  "1-month",
  "3-month",
  "6-month",
  "1-year",
  "unlimited",
  "custom",
] as const;

export const FEATURE_KEYS = [
  "meal",
  "exercise",
  "analyze",
  "chat",
  "workout",
  "daily-meal",
  "weekly",
  "exercise-demo",
] as const;

export const MEMBERSHIP_OPTION_VALUES: MembershipType[] = [
  "1-month",
  "3-month",
  "6-month",
  "1-year",
  "unlimited",
  "custom",
];

export const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; className: string }
> = {
  Admin: { icon: Shield, className: "text-purple-400 bg-purple-400/10" },
  Aktif: { icon: CheckCircle, className: "text-green-400 bg-green-400/10" },
  Bekliyor: { icon: Clock, className: "text-yellow-400 bg-yellow-400/10" },
  "Süresi Dolmuş": {
    icon: AlertTriangle,
    className: "text-red-400 bg-red-400/10",
  },
  "Üyelik Dolmuş": {
    icon: AlertTriangle,
    className: "text-orange-400 bg-orange-400/10",
  },
  Dondurulmuş: { icon: Snowflake, className: "text-blue-400 bg-blue-400/10" },
};

export function useTimeAgo() {
  const t = useTranslations("admin.timeAgo");
  return (date: Date | null): string => {
    if (!date) return t("none");
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("justNow");
    if (minutes < 60) return t("minutes", { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("hours", { n: hours });
    const days = Math.floor(hours / 24);
    return t("days", { n: days });
  };
}

export function useFeatureLabel() {
  const t = useTranslations("admin.featuresShort");
  return (key: string): string => {
    if ((FEATURE_KEYS as readonly string[]).includes(key)) {
      return t(key);
    }
    return key;
  };
}

export function useStatusLabel() {
  const t = useTranslations("admin.status");
  return (status: string): string => {
    const STATUS_KEYS = [
      "Admin",
      "Aktif",
      "Bekliyor",
      "Süresi Dolmuş",
      "Üyelik Dolmuş",
      "Dondurulmuş",
    ];
    if (STATUS_KEYS.includes(status)) {
      return t(status);
    }
    return status;
  };
}

export function useMembershipLabel() {
  const t = useTranslations("admin.membership");
  return (key: string): string => {
    if ((MEMBERSHIP_KEYS as readonly string[]).includes(key)) {
      return t(key);
    }
    return key;
  };
}

export function daysSinceFrozen(frozenAt: Date | string | null): number {
  if (!frozenAt) return 0;
  return (Date.now() - new Date(frozenAt).getTime()) / 86400000;
}
