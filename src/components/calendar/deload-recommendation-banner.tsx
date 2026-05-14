"use client";

import type { ReactNode } from "react";
import { TrendingDown, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { DeloadRecommendation } from "@/lib/deload-policy";
import { bandOf, readinessBandColor } from "@/lib/readiness-policy";

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
  const tReadiness = useTranslations("readiness.deload");

  if (recommendation.severity === "none") return null;

  const isHard = recommendation.severity === "hard";
  const containerCls = isHard
    ? "border-destructive/40 bg-destructive/5"
    : "border-warning/40 bg-warning/10";
  const titleCls = isHard ? "text-destructive" : "text-warning";
  const severityBadgeCls = isHard
    ? "bg-destructive/15 text-destructive border-destructive/30"
    : "bg-warning/15 text-warning border-warning/30";
  const titleKey = isHard
    ? "deloadRecommendedHardTitle"
    : "deloadRecommendedSoftTitle";
  const severityKey = isHard ? "severityHigh" : "severitySoft";

  const reasonLines: Array<{ key: string; node: ReactNode }> = [];
  if (recommendation.reasons.includes("cadence")) {
    reasonLines.push({
      key: "cadence",
      node: t("deloadReasonCadence", { weeks: recommendation.consecutiveTrainingWeeks }),
    });
  }
  if (recommendation.reasons.includes("sleep_quality")) {
    reasonLines.push({ key: "sleep_quality", node: t("deloadReasonSleepQuality") });
  }
  if (recommendation.reasons.includes("sleep_duration")) {
    reasonLines.push({ key: "sleep_duration", node: t("deloadReasonSleepDuration") });
  }
  if (recommendation.reasons.includes("completion")) {
    reasonLines.push({ key: "completion", node: t("deloadReasonCompletion") });
  }
  if (recommendation.reasons.includes("low_readiness")) {
    const avg = Math.round(recommendation.readiness7d.average ?? 0);
    const band = bandOf(avg);
    const barColor = readinessBandColor(band);
    reasonLines.push({
      key: "low_readiness",
      node: (
        <span className="flex items-center gap-2 flex-wrap">
          <span className="flex-1 min-w-0">
            {tReadiness("lowReadiness", {
              avg,
              samples: recommendation.readiness7d.samples,
            })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-background/70 px-2 py-0.5">
            <span className="relative h-1.5 w-12 overflow-hidden rounded-full bg-muted">
              <span
                className={`absolute inset-y-0 left-0 ${barColor}`}
                style={{ width: `${Math.max(4, Math.min(100, avg))}%` }}
              />
            </span>
            <span className="text-[10px] font-semibold tabular-nums text-foreground">
              {avg}
            </span>
          </span>
        </span>
      ),
    });
  }

  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${containerCls}`}>
      <div className="flex items-start gap-2">
        <TrendingDown className={`h-4 w-4 shrink-0 mt-0.5 ${titleCls}`} />
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5">
          <p className={`text-xs font-semibold ${titleCls}`}>
            {t(titleKey)}
          </p>
          <span
            className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${severityBadgeCls}`}
          >
            {tBanner(severityKey)}
          </span>
        </div>
      </div>

      {reasonLines.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-foreground">
            {tBanner("reasonsTitle")}
          </p>
          <ul className="space-y-0.5">
            {reasonLines.map((line) => (
              <li
                key={line.key}
                className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5"
              >
                <span aria-hidden className="text-muted-foreground/60 mt-[0.5em]">
                  •
                </span>
                <span className="flex-1 min-w-0 wrap-break-word">{line.node}</span>
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
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-success">
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
