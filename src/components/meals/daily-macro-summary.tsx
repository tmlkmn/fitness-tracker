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
}: MacroSummaryProps) {
  const { data: profile } = useUserProfile();
  const t = useTranslations("meals.form");
  const tCycle = useTranslations("calendar.aiWeekly");
  const energyUnit = (profile?.energyUnit as EnergyUnit) ?? "kcal";
  const displayCalories = Math.round(kcalToDisplay(calories, energyUnit));
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
        <MacroCell value={protein} unit="g" label={t("protein")} target={targets?.protein} />
        <MacroCell value={carbs} unit="g" label={t("carbs")} target={targets?.carbs} />
        <MacroCell value={fat} unit="g" label={t("fat")} target={targets?.fat} />
      </div>
    </div>
  );
}
