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
      parts.push(`${sourceCounts.exercise} egzersiz`);
    if (includeMeals && sourceCounts.meal > 0)
      parts.push(`${sourceCounts.meal} öğün`);
    const summary = parts.length > 0 ? parts.join(" + ") : "boş içerik";

    if (effectiveMode === "swap") {
      return `${sourceLabel} ↔ ${targetLabel} içerikleri yer değişecek`;
    }
    if (effectiveMode === "replace") {
      const targetItems: string[] = [];
      if (includeWorkout && selectedTarget.exerciseCount > 0)
        targetItems.push(`${selectedTarget.exerciseCount} egzersiz`);
      if (includeMeals && selectedTarget.mealCount > 0)
        targetItems.push(`${selectedTarget.mealCount} öğün`);
      const deletedNote =
        targetItems.length > 0
          ? ` · ${targetLabel}'in ${targetItems.join(" + ")}'i silinecek`
          : "";
      return `${sourceLabel} → ${targetLabel}: ${summary}${deletedNote}`;
    }
    return `${sourceLabel} → ${targetLabel}: ${summary} taşınacak`;
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ArrowRightLeft className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">Programı Taşı</span>
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
                  Neyi taşımak istiyorsun?
                </p>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md hover:bg-muted/40">
                  <Checkbox
                    checked={includeWorkout}
                    onCheckedChange={(v) => setIncludeWorkout(v === true)}
                    disabled={sourceCounts.exercise === 0}
                  />
                  <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1">Antrenman</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {sourceCounts.exercise} egz
                  </Badge>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md hover:bg-muted/40">
                  <Checkbox
                    checked={includeMeals}
                    onCheckedChange={(v) => setIncludeMeals(v === true)}
                    disabled={sourceCounts.meal === 0}
                  />
                  <UtensilsCrossed className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="flex-1">Beslenme</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {sourceCounts.meal} öğün
                  </Badge>
                </label>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Hedef gün:
                </p>
                {daysLoading ? (
                  <div className="space-y-1.5">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-md" />
                    ))}
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Bu hafta taşıyabileceğin başka gün yok
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
                                  {c.exerciseCount} egz
                                </Badge>
                              )}
                              {c.mealCount > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 px-1"
                                >
                                  {c.mealCount} öğün
                                </Badge>
                              )}
                              {isRest &&
                                c.exerciseCount === 0 &&
                                c.mealCount === 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-4 px-1"
                                  >
                                    Dinlenme
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
                    Hedef günde antrenman var. Ne yapılsın?
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
                      <p className="text-sm font-medium">İki günü değiştir</p>
                      <p className="text-[11px] text-muted-foreground">
                        Hedef günün içeriği bu güne, bu günün içeriği hedefe
                        geçer
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
                        Hedef antrenmanın yerine geç
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Hedef günün eski içeriği silinir, bu gün dinlenme olur
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
                  Vazgeç
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {move.isPending ? "Taşınıyor..." : "Taşı"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
