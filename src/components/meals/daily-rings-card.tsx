"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MultiProgressRing } from "@/components/ui/progress-ring";
import { Flame, Drumstick, CheckCircle2 } from "lucide-react";
import { computeMealMacros } from "@/lib/meal-macros";
import { useUserProfile, useResolvedMacroTargets } from "@/hooks/use-user";
import { useTodayDashboard } from "@/hooks/use-plans";

export function DailyRingsCard() {
  const { data: profile } = useUserProfile();
  const { data: today } = useTodayDashboard();
  const { data: targets } = useResolvedMacroTargets();

  const macros = useMemo(() => computeMealMacros(today?.meals ?? []), [today?.meals]);

  const mealsCompleted = macros.completedCount;
  const mealsTotal = macros.total;
  const exercises = today?.exercises ?? [];
  const exercisesCompleted = exercises.filter((e) => e.isCompleted).length;
  const exercisesTotal = exercises.length;

  const isNutritionOnly = profile?.serviceType === "nutrition";
  const totalTasks = isNutritionOnly
    ? mealsTotal
    : mealsTotal + exercisesTotal;
  const doneTasks = isNutritionOnly
    ? mealsCompleted
    : mealsCompleted + exercisesCompleted;

  if (!profile || !today?.dailyPlan) return null;

  const calorieTarget = targets?.calories ?? 0;
  const proteinTarget = targets?.protein ?? 0;

  if (calorieTarget === 0 && proteinTarget === 0 && totalTasks === 0) return null;

  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <MultiProgressRing
            size={140}
            strokeWidth={11}
            gap={3}
            rings={[
              {
                value: macros.calories,
                max: calorieTarget || 1,
                indicatorClassName: "stroke-orange-500",
                trackClassName: "stroke-orange-500/30",
                label: `Kalori: ${macros.calories} / ${calorieTarget} kcal`,
              },
              {
                value: macros.protein,
                max: proteinTarget || 1,
                indicatorClassName: "stroke-sky-500",
                trackClassName: "stroke-sky-500/30",
                label: `Protein: ${macros.protein} / ${proteinTarget} g`,
              },
              {
                value: doneTasks,
                max: totalTasks || 1,
                indicatorClassName: "stroke-primary",
                trackClassName: "stroke-primary/30",
                label: `Tamamlanan: ${doneTasks} / ${totalTasks}`,
              },
            ]}
            centerSlot={
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {completionPct}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                  Tamamlandı
                </p>
              </div>
            }
          />

          <div className="flex-1 space-y-3 min-w-0">
            <RingLegend
              icon={Flame}
              colorClass="text-orange-500"
              label="Kalori"
              value={macros.calories}
              target={calorieTarget}
              unit="kcal"
            />
            <RingLegend
              icon={Drumstick}
              colorClass="text-sky-500"
              label="Protein"
              value={macros.protein}
              target={proteinTarget}
              unit="g"
            />
            <RingLegend
              icon={CheckCircle2}
              colorClass="text-primary"
              label="Görevler"
              value={doneTasks}
              target={totalTasks}
              unit=""
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RingLegend({
  icon: Icon,
  colorClass,
  label,
  value,
  target,
  unit,
}: {
  icon: typeof Flame;
  colorClass: string;
  label: string;
  value: number;
  target: number;
  unit: string;
}) {
  const pct = target > 0 ? Math.round((value / target) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-xs font-medium tabular-nums">
            {value}
            {target > 0 && (
              <span className="text-muted-foreground">
                {" / "}
                {target}
              </span>
            )}
            {unit && <span className="text-muted-foreground ml-0.5">{unit}</span>}
          </span>
        </div>
        {target > 0 && (
          <p className="text-[10px] text-muted-foreground tabular-nums">{pct}%</p>
        )}
      </div>
    </div>
  );
}
