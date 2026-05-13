"use client";

import { Zap, Moon, Check, Info } from "lucide-react";
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
 * is "hard" or "soft". Hierarchy is reasons-first: the user sees WHY a
 * deload week is recommended (consecutive load, sleep, completion) before
 * the technical definition of what a deload changes. The definition lives
 * below in a smaller "what is deload?" line — kept accessible but not
 * competing with the personalized reasons for attention.
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

  const reasonLines: string[] = [];
  if (recommendation.reasons.includes("cadence")) {
    reasonLines.push(
      t("deloadReasonCadence", { weeks: recommendation.consecutiveTrainingWeeks }),
    );
  }
  if (recommendation.reasons.includes("sleep_quality")) {
    reasonLines.push(t("deloadReasonSleepQuality"));
  }
  if (recommendation.reasons.includes("sleep_duration")) {
    reasonLines.push(t("deloadReasonSleepDuration"));
  }
  if (recommendation.reasons.includes("completion")) {
    reasonLines.push(t("deloadReasonCompletion"));
  }

  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${containerCls}`}>
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${titleCls}`} />
        <p className={`text-xs font-semibold flex-1 min-w-0 ${titleCls}`}>
          {t(titleKey)}
        </p>
      </div>

      {reasonLines.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-foreground">
            {tBanner("reasonsTitle")}
          </p>
          <ul className="space-y-0.5">
            {reasonLines.map((line, i) => (
              <li
                key={i}
                className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5"
              >
                <span aria-hidden className="text-muted-foreground/60 mt-[0.5em]">
                  •
                </span>
                <span className="flex-1 min-w-0 wrap-break-word">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-start gap-1.5 rounded-md bg-background/50 px-2 py-1.5">
        <Info className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/70" />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="font-medium">{tBanner("definitionTitle")}</span>{" "}
          {t("deloadToggleHelp")}
        </p>
      </div>

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
