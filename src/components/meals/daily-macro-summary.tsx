"use client";

import { cn } from "@/lib/utils";
import type { MacroTargets } from "@/lib/macro-targets";
import { macroProgressColor } from "@/lib/macro-targets";
import { useUserProfile } from "@/hooks/use-user";
import {
  energyUnitLabel,
  kcalToDisplay,
  type EnergyUnit,
} from "@/lib/units";
import type { SupplementMacroTotals } from "@/lib/supplement-macros";
import { Flame } from "lucide-react";
import { useTranslations } from "next-intl";

interface MacroSummaryProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targets?: MacroTargets | null;
  /** Day's planType — when set and cyclingLabel != "off", a small badge is rendered. */
  planType?: string | null;
  /** Cycling profile label from `getResolvedMacroTargetsForDay`. */
  cyclingLabel?: "off" | "moderate" | "aggressive";
  /** Completed supplement macro contribution; added to grid totals when present. */
  supplementMacros?: SupplementMacroTotals | null;
}

function MacroCell({
  value,
  unit,
  label,
  target,
  highlight,
}: {
  value: number;
  unit: string;
  label: string;
  target?: number;
  highlight?: boolean;
}) {
  const hasTarget = typeof target === "number" && target > 0;
  const pct = hasTarget ? Math.min(100, Math.round((value / target) * 100)) : 0;

  return (
    <div className="text-center space-y-1">
      <p className={cn("text-lg font-bold leading-none tabular-nums", highlight && "text-primary")}>
        {value}
        <span className="text-xs font-normal opacity-70">{unit}</span>
      </p>
      {hasTarget ? (
        <>
          <p className="text-[10px] text-muted-foreground leading-none tabular-nums">
            / {target}
            {unit}
          </p>
          <div className="h-1 w-full bg-muted-foreground/15 rounded overflow-hidden">
            <div
              className={cn("h-full transition-all", macroProgressColor(value, target))}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">{label}</p>
      )}
      {hasTarget && (
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      )}
    </div>
  );
}

export function DailyMacroSummary({
  calories,
  protein,
  carbs,
  fat,
  targets,
  planType,
  cyclingLabel,
  supplementMacros,
}: MacroSummaryProps) {
  const { data: profile } = useUserProfile();
  const t = useTranslations("meals.form");
  const tCycle = useTranslations("calendar.aiWeekly");
  const tSupp = useTranslations("meals.list");
  const energyUnit = (profile?.energyUnit as EnergyUnit) ?? "kcal";

  const suppActive = !!supplementMacros && supplementMacros.contributingCount > 0;
  const totalCalories = suppActive ? calories + supplementMacros!.calories : calories;
  const totalProtein = suppActive ? protein + supplementMacros!.protein : protein;
  const totalCarbs = suppActive ? carbs + supplementMacros!.carbs : carbs;
  const totalFat = suppActive ? fat + supplementMacros!.fat : fat;

  const displayCalories = Math.round(kcalToDisplay(totalCalories, energyUnit));
  const displayTarget = targets?.calories
    ? Math.round(kcalToDisplay(targets.calories, energyUnit))
    : undefined;

  let badgeLabel: string | null = null;
  if (cyclingLabel && cyclingLabel !== "off") {
    if (planType === "workout") badgeLabel = tCycle("carbCyclingBadgeWorkout");
    else if (planType === "swimming") badgeLabel = tCycle("carbCyclingBadgeSwimming");
    else if (planType === "rest" || planType === "nutrition") badgeLabel = tCycle("carbCyclingBadgeRest");
  }

  return (
    <div className="space-y-1.5">
      {badgeLabel && (
        <p className="text-[10px] text-muted-foreground/80 px-1">{badgeLabel}</p>
      )}
      <div className="grid grid-cols-4 gap-2 p-3 bg-muted rounded-lg">
        <MacroCell
          value={displayCalories}
          unit=""
          label={energyUnitLabel(energyUnit)}
          target={displayTarget}
          highlight
        />
        <MacroCell value={totalProtein} unit="g" label={t("protein")} target={targets?.protein} />
        <MacroCell value={totalCarbs} unit="g" label={t("carbs")} target={targets?.carbs} />
        <MacroCell value={totalFat} unit="g" label={t("fat")} target={targets?.fat} />
      </div>
      {suppActive && (
        <p className="text-[10px] text-muted-foreground/80 px-1 flex items-center gap-1 tabular-nums">
          <Flame className="h-2.5 w-2.5 text-orange-400/80" />
          +{Math.round(kcalToDisplay(supplementMacros!.calories, energyUnit))} {energyUnitLabel(energyUnit)}
          {supplementMacros!.protein > 0 ? ` · +${supplementMacros!.protein}g P` : null}
          {supplementMacros!.carbs > 0 ? ` · +${supplementMacros!.carbs}g C` : null}
          {supplementMacros!.fat > 0 ? ` · +${supplementMacros!.fat}g F` : null}
          {" · "}
          {tSupp("supplementContribution", { count: supplementMacros!.contributingCount })}
        </p>
      )}
    </div>
  );
}
