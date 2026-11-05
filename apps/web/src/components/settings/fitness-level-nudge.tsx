"use client";

import { useState } from "react";
import { TrendingUp, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type {
  FitnessLevel,
  FitnessLevelSuggestion,
} from "@/lib/fitness-level-suggester";

interface FitnessLevelNudgeProps {
  suggestion: FitnessLevelSuggestion;
  /** Called when the user accepts the suggestion — parent should set the level state. */
  onApply: (level: FitnessLevel) => void;
  /** True once the parent's local select state matches the suggested level — banner collapses to a Save hint. */
  applied: boolean;
}

/**
 * Up-only fitness level upgrade nudge. Renders above the level select in
 * ProfileEditor when the data-derived suggestion outranks the declared
 * level. Accepting the nudge updates the parent's local state — the user
 * still has to click the editor's Save button for the change to persist.
 */
export function FitnessLevelNudge({
  suggestion,
  onApply,
  applied,
}: FitnessLevelNudgeProps) {
  const t = useTranslations("settings.profileEditor.fitnessLevelNudge");
  const tLevels = useTranslations("settings.profileEditor.fitnessLevels");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const reasonText = suggestion.reasons
    .map((r) => {
      if (r.kind === "history") return t("reasonHistory", { weeks: r.weeks });
      if (r.kind === "completion") {
        return t("reasonCompletion", { rate: Math.round(r.rate * 100) });
      }
      return t("reasonVolume", { sets: r.sets });
    })
    .join(" · ");

  return (
    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <TrendingUp className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-emerald-500">
            {t("title", { level: tLevels(suggestion.suggested) })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            {reasonText}
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
      {applied ? (
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
          <Check className="h-3.5 w-3.5" />
          {t("applyHint")}
        </p>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onApply(suggestion.suggested)}
          className="w-full h-8 text-xs"
        >
          {t("applyAction", { level: tLevels(suggestion.suggested) })}
        </Button>
      )}
    </div>
  );
}
