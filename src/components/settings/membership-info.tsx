"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";

const MEMBERSHIP_LABELS: Record<string, string> = {
  unlimited: "Sınırsız",
  "1-month": "1 Ay",
  "3-month": "3 Ay",
  "6-month": "6 Ay",
  "1-year": "1 Yıl",
  custom: "Özel",
};

interface MembershipInfoProps {
  profile: {
    membershipType: string | null;
    membershipStartDate: Date | null;
    membershipEndDate: Date | null;
  };
}

export function MembershipInfo({ profile }: MembershipInfoProps) {
  const label =
    MEMBERSHIP_LABELS[profile.membershipType ?? ""] ?? profile.membershipType;
  const startDate = profile.membershipStartDate
    ? new Date(profile.membershipStartDate).toLocaleDateString("tr-TR")
    : null;
  const endDate = profile.membershipEndDate
    ? new Date(profile.membershipEndDate).toLocaleDateString("tr-TR")
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
          <span className="text-sm text-muted-foreground">Üyelik</span>
        </div>
        <Badge variant={isExpired ? "destructive" : "secondary"}>{label}</Badge>
      </div>
      {startDate && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">Başlangıç</span>
          <span className="text-sm font-medium">{startDate}</span>
        </div>
      )}
      {endDate && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">Bitiş</span>
          <span className={`text-sm font-medium ${isExpired ? "text-destructive" : ""}`}>
            {endDate}
          </span>
        </div>
      )}
      {remainingDays !== null && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">Kalan Süre</span>
          <span className="text-sm font-medium text-primary">{remainingDays} gün</span>
        </div>
      )}
      {profile.membershipType === "unlimited" && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground pl-6">Bitiş</span>
          <span className="text-sm font-medium">—</span>
        </div>
      )}
    </div>
  );
}
