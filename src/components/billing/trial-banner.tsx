"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useBilling } from "@/hooks/use-billing";

/**
 * Compact banner shown while a user is on trial. Renders nothing for any
 * other billing state.
 */
export function TrialBanner() {
  const t = useTranslations("billing");
  const { data: billing } = useBilling();
  // Snapshot "now" once at mount so the render stays pure across re-renders.
  const [now] = useState(() => Date.now());

  if (!billing || billing.status !== "trialing" || !billing.trialEndsAt) {
    return null;
  }

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(billing.trialEndsAt).getTime() - now) / (1000 * 60 * 60 * 24),
    ),
  );

  return (
    <Link
      href="/ayarlar/odeme"
      className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm"
    >
      <Sparkles className="h-4 w-4 text-primary shrink-0" />
      <span className="flex-1">{t("trialBanner", { daysLeft })}</span>
      <span className="font-medium text-primary">{t("trialBannerCta")}</span>
    </Link>
  );
}
