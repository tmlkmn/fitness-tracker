"use client";

import { useLocale } from "next-intl";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";
import type { UserWithStatus } from "@/actions/admin";
import { useMembershipLabel } from "./admin-labels";

export function MembershipBadge({ user }: { user: UserWithStatus }) {
  const locale = useLocale() as Locale;
  const membershipLabel = useMembershipLabel();
  if (!user.membershipType || user.status === "Admin") return null;
  const label = membershipLabel(user.membershipType);
  const endDate = user.membershipEndDate
    ? formatDate(user.membershipEndDate, locale)
    : null;
  return (
    <span className="text-xs text-muted-foreground">
      {label}
      {endDate && ` · ${endDate}`}
    </span>
  );
}
