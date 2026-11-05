"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getLevelRecommendation, type FitnessLevel } from "@/lib/day-modes-default";

interface DayModeLevelHintProps {
  fitnessLevel: string | null | undefined;
  /** True once the user has cycled at least one day — banner switches to the "personalized" line. */
  personalized: boolean;
}

const DAY_LABEL_KEYS: Record<number, string> = {
  0: "mon",
  1: "tue",
  2: "wed",
  3: "thu",
  4: "fri",
  5: "sat",
  6: "sun",
};

function bodyKeyForLevel(level: FitnessLevel): string {
  if (level === "beginner") return "beginnerBody";
  if (level === "intermediate") return "intermediateBody";
  return "advancedBody";
}

function titleKeyForLevel(level: FitnessLevel): string {
  if (level === "beginner") return "beginnerTitle";
  if (level === "intermediate") return "intermediateTitle";
  return "advancedTitle";
}

export function DayModeLevelHint({ fitnessLevel, personalized }: DayModeLevelHintProps) {
  const t = useTranslations("calendar.aiWeekly.levelHint");
  const tDays = useTranslations("calendar.aiWeekly.levelHint.days");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Missing level — point user to settings, don't infer.
  if (!fitnessLevel) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 flex items-start gap-2">
        <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t("missingLevel")}{" "}
            <Link
              href="/ayarlar"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {t("settingsLink")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const rec = getLevelRecommendation(fitnessLevel);
  const dayLabels = rec.workoutDayIndices
    .map((i) => tDays(DAY_LABEL_KEYS[i]))
    .join(", ");

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 flex items-start gap-2">
      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary">
          {t(titleKeyForLevel(rec.level), { count: rec.workoutDays })}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
          {personalized
            ? t("personalized")
            : t(bodyKeyForLevel(rec.level), { days: dayLabels })}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("dismiss")}
        className="h-5 w-5 rounded hover:bg-muted/50 flex items-center justify-center text-muted-foreground/70 hover:text-foreground shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
