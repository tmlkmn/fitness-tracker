"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightLeft, Dumbbell, UtensilsCrossed, Moon } from "lucide-react";
import {
  useDailyPlan,
  useDailyPlansWithContentCounts,
} from "@/hooks/use-plans";
import { useMoveDayContents } from "@/hooks/use-move-day-contents";
import { getTurkeyTodayStr } from "@/lib/utils";
import type { MoveMode } from "@/actions/day-content-move";
import { useTranslations } from "next-intl";

interface MoveDayContentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceDailyPlanId: number;
  defaultIncludeWorkout?: boolean;
  defaultIncludeMeals?: boolean;
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const [, m, d] = dateStr.split("-");
  return `${parseInt(d, 10)}.${parseInt(m, 10)}`;
}

export function MoveDayContentsDialog({
  open,
  onOpenChange,
  sourceDailyPlanId,
  defaultIncludeWorkout = true,
  defaultIncludeMeals = false,
}: MoveDayContentsDialogProps) {
  const t = useTranslations("workout.moveDialog");
  const { data: source, isLoading: sourceLoading } = useDailyPlan(
    sourceDailyPlanId,
    open,
  );
  const weeklyPlanId = source?.weeklyPlanId ?? 0;
  const { data: days, isLoading: daysLoading } = useDailyPlansWithContentCounts(
    weeklyPlanId,
    open && !!weeklyPlanId,
  );
  const move = useMoveDayContents();

  const [includeWorkout, setIncludeWorkout] = useState(defaultIncludeWorkout);
  const [includeMeals, setIncludeMeals] = useState(defaultIncludeMeals);
  const [selectedTargetId, setSelectedTargetId] = useState<number | null>(null);
  const [mode, setMode] = useState<Exclude<MoveMode, "move">>("swap");

  const today = getTurkeyTodayStr();
  const sourceCounts = useMemo(() => {
    if (!days || !source) return { exercise: 0, meal: 0 };
    const me = days.find((d) => d.id === source.id);
    return { exercise: me?.exerciseCount ?? 0, meal: me?.mealCount ?? 0 };
  }, [days, source]);

  const candidates = useMemo(() => {
    if (!days || !source) return [];
    return days.filter(
      (d) => d.id !== source.id && (!d.date || d.date >= today),
    );
  }, [days, source, today]);

  const selectedTarget = useMemo(
    () => candidates.find((c) => c.id === selectedTargetId) ?? null,
    [candidates, selectedTargetId],
  );

  const targetIsWorkoutDay =
    selectedTarget?.planType === "workout" ||
    selectedTarget?.planType === "swimming";
  const showModeSelector = includeWorkout && targetIsWorkoutDay;

  const effectiveMode: MoveMode = showModeSelector ? mode : "move";

  const canSubmit =
    !!selectedTarget &&
    (includeWorkout || includeMeals) &&
    !move.isPending;

  const handleSubmit = () => {
    if (!selectedTarget) return;
    move.mutate(
      {
        sourceDailyPlanId,
        targetDailyPlanId: selectedTarget.id,
        mode: effectiveMode,
        includeWorkout,
        includeMeals,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  const sourceLabel = source
    ? `${source.dayName}${source.date ? ` ${formatShortDate(source.date)}` : ""}`
    : "";
  const targetLabel = selectedTarget
    ? `${selectedTarget.dayName}${selectedTarget.date ? ` ${formatShortDate(selectedTarget.date)}` : ""}`
    : "";

  const previewText = (() => {
    if (!selectedTarget) return null;
    const parts: string[] = [];
    if (includeWorkout && sourceCounts.exercise > 0)
      parts.push(t("exerciseUnit", { count: sourceCounts.exercise }));
    if (includeMeals && sourceCounts.meal > 0)
      parts.push(t("mealUnit", { count: sourceCounts.meal }));
    const summary = parts.length > 0 ? parts.join(" + ") : t("summaryEmpty");

    if (effectiveMode === "swap") {
      return t("previewSwap", { source: sourceLabel, target: targetLabel });
    }
    if (effectiveMode === "replace") {
      const targetItems: string[] = [];
      if (includeWorkout && selectedTarget.exerciseCount > 0)
        targetItems.push(t("exerciseUnit", { count: selectedTarget.exerciseCount }));
      if (includeMeals && selectedTarget.mealCount > 0)
        targetItems.push(t("mealUnit", { count: selectedTarget.mealCount }));
      const deletedNote =
        targetItems.length > 0
          ? t("previewDeleted", { target: targetLabel, items: targetItems.join(" + ") })
          : "";
      return t("previewReplace", { source: sourceLabel, target: targetLabel, summary }) + deletedNote;
    }
    return t("previewMove", { source: sourceLabel, target: targetLabel, summary });
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ArrowRightLeft className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{t("title")}</span>
          </DialogTitle>
          {source && (
            <p className="text-xs text-muted-foreground">
              {sourceLabel} → ?
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {sourceLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  {t("whatToMove")}
                </p>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md hover:bg-muted/40">
                  <Checkbox
                    checked={includeWorkout}
                    onCheckedChange={(v) => setIncludeWorkout(v === true)}
                    disabled={sourceCounts.exercise === 0}
                  />
                  <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1">{t("workout")}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {t("exerciseCount", { count: sourceCounts.exercise })}
                  </Badge>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md hover:bg-muted/40">
                  <Checkbox
                    checked={includeMeals}
                    onCheckedChange={(v) => setIncludeMeals(v === true)}
                    disabled={sourceCounts.meal === 0}
                  />
                  <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1">{t("nutrition")}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {t("mealCount", { count: sourceCounts.meal })}
                  </Badge>
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  {t("targetDay")}
                </p>
                {daysLoading ? (
                  <div className="space-y-1.5">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-md" />
                    ))}
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("noTargets")}
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {candidates.map((c) => {
                      const isSelected = c.id === selectedTargetId;
                      const isRest = c.planType === "rest";
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedTargetId(c.id)}
                          className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                            isSelected
                              ? "bg-primary/10 border-primary/40"
                              : "bg-muted/30 border-transparent hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isRest ? (
                                <Moon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              ) : (
                                <Dumbbell className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {c.dayName}{" "}
                                  <span className="text-xs text-muted-foreground font-normal">
                                    {formatShortDate(c.date)}
                                  </span>
                                </p>
                                {c.workoutTitle && (
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {c.workoutTitle}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {c.exerciseCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1"
                                >
                                  {t("exerciseCount", { count: c.exerciseCount })}
                                </Badge>
                              )}
                              {c.mealCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1"
                                >
                                  {t("mealCount", { count: c.mealCount })}
                                </Badge>
                              )}
                              {isRest &&
                                c.exerciseCount === 0 &&
                                c.mealCount === 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-4 px-1"
                                  >
                                    {t("rest")}
                                  </Badge>
                                )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {showModeSelector && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">
                    {t("modeQuestion")}
                  </p>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => setMode("swap")}
                      className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                        mode === "swap"
                          ? "bg-primary/10 border-primary/40"
                          : "bg-muted/30 border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <p className="text-sm font-medium">{t("modeSwap")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("modeSwapDesc")}
                      </p>
                    </button>
                    <button
                      onClick={() => setMode("replace")}
                      className={`w-full text-left p-2.5 rounded-md border transition-colors ${
                        mode === "replace"
                          ? "bg-primary/10 border-primary/40"
                          : "bg-muted/30 border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <p className="text-sm font-medium">
                        {t("modeReplace")}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("modeReplaceDesc")}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {previewText && (
                <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-md">
                  <p className="text-xs text-muted-foreground">{previewText}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={move.isPending}
                >
                  {t("cancel")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {move.isPending ? t("submitting") : t("submit")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
