"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";

interface MembershipInfoProps {
  profile: {
    membershipType: string | null;
    membershipStartDate: Date | null;
    membershipEndDate: Date | null;
  };
}

export function MembershipInfo({ profile }: MembershipInfoProps) {
  const t = useTranslations("settings.membershipInfo");
  const tTypes = useTranslations("settings.membershipTypes");
  const locale = useLocale() as Locale;

  const type = profile.membershipType ?? "";
  const knownType = ["unlimited", "1-month", "3-month", "6-month", "1-year", "custom"].includes(
    type,
  );
  const label = knownType ? tTypes(type as "unlimited") : type || "";
  const startDate = profile.membershipStartDate
    ? formatDate(profile.membershipStartDate, locale)
    : null;
  const endDate = profile.membershipEndDate
    ? formatDate(profile.membershipEndDate, locale)
    : null;

  const [snapshot] = useState(() => {
    if (!profile.membershipEndDate) return { isExpired: false, remainingDays: null };
    const end = new Date(profile.membershipEndDate).getTime();
    const now = Date.now();
    const expired = end <= now;
    return {
      isExpired: expired,
      remainingDays: expired ? null : Math.ceil((end - now) / (1000 * 60 * 60 * 24)),
    };
  });

  const { isExpired, remainingDays } = snapshot;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("title")}</span>
        </div>
        <Badge variant={isExpired ? "destructive" : "secondary"}>{label}</Badge>
      </div>
      {startDate && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">{t("start")}</span>
          <span className="text-sm font-medium">{startDate}</span>
        </div>
      )}
      {endDate && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">{t("end")}</span>
          <span className={`text-sm font-medium ${isExpired ? "text-destructive" : ""}`}>
            {endDate}
          </span>
        </div>
      )}
      {remainingDays !== null && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">{t("remaining")}</span>
          <span className="text-sm font-medium text-primary">
            {remainingDays} {t("daysSuffix")}
          </span>
        </div>
      )}
      {profile.membershipType === "unlimited" && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">{t("end")}</span>
          <span className="text-sm font-medium">—</span>
        </div>
      )}
    </div>
  );
}
