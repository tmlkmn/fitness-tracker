"use client";

import { Zap, Moon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { DeloadRecommendation } from "@/lib/deload-policy";

interface DeloadRecommendationBannerProps {
  recommendation: DeloadRecommendation;
  checked: boolean;
  onAccept: () => void;
}

/**
 * Prominent banner shown above the deload checkbox when the recovery signal
 * is "hard" or "soft". Severity drives icon + color; reason chips are derived
 * from the recommendation's `reasons` array (i18n keys already exist under
 * `calendar.aiWeekly.deloadReason*`). When the checkbox is already checked
 * the CTA collapses to a small "active" badge — no second toggle path.
 */
export function DeloadRecommendationBanner({
  recommendation,
  checked,
  onAccept,
}: DeloadRecommendationBannerProps) {
  const t = useTranslations("calendar.aiWeekly");
  const tBanner = useTranslations("calendar.aiWeekly.deloadBanner");

  if (recommendation.severity === "none") return null;

  const isHard = recommendation.severity === "hard";
  const containerCls = isHard
    ? "border-amber-500/40 bg-amber-500/10"
    : "border-blue-500/40 bg-blue-500/10";
  const titleCls = isHard ? "text-amber-500" : "text-blue-500";
  const Icon = isHard ? Zap : Moon;
  const titleKey = isHard
    ? "deloadRecommendedHardTitle"
    : "deloadRecommendedSoftTitle";

  const reasonChips: string[] = [];
  if (recommendation.reasons.includes("cadence")) {
    reasonChips.push(
      t("deloadReasonCadence", { weeks: recommendation.consecutiveTrainingWeeks }),
    );
  }
  if (recommendation.reasons.includes("sleep_quality")) {
    reasonChips.push(t("deloadReasonSleepQuality"));
  }
  if (recommendation.reasons.includes("sleep_duration")) {
    reasonChips.push(t("deloadReasonSleepDuration"));
  }
  if (recommendation.reasons.includes("completion")) {
    reasonChips.push(t("deloadReasonCompletion"));
  }

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${containerCls}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${titleCls}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold ${titleCls}`}>
            {t(titleKey)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {t("deloadToggleHelp")}
          </p>
        </div>
      </div>

      {reasonChips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {reasonChips.map((chip, i) => (
            <span
              key={i}
              className="inline-block rounded-full bg-background/60 border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      {checked ? (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
          <Check className="h-3.5 w-3.5" />
          {tBanner("activeBadge")}
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAccept}
          className="w-full h-8 text-xs"
        >
          {tBanner("applyAction")}
        </Button>
      )}
    </div>
  );
}
