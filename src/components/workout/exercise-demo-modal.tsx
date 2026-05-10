"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, AlertCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import Image from "next/image";
import { useExerciseDemo } from "@/hooks/use-exercise-demo";
import { formatAiError } from "@/lib/ai-errors";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ExerciseDemoModalProps {
  name: string;
  triggerClassName?: string;
  triggerLabel?: string;
}

const MUSCLE_KEYS = new Set([
  "abdominals", "abductors", "adductors", "biceps", "calves", "chest",
  "forearms", "glutes", "hamstrings", "lats", "lower_back", "middle_back",
  "neck", "quadriceps", "shoulders", "traps", "triceps", "pectorals",
  "delts", "serratus_anterior", "abs", "cardiovascular_system",
  "levator_scapulae", "spine",
]);

export function ExerciseDemoModal({ name, triggerClassName, triggerLabel }: ExerciseDemoModalProps) {
  const t = useTranslations("exercises.demoModal");
  const [open, setOpen] = useState(false);

  const getMuscleLabel = (muscle: string): string => {
    const key = muscle.toLowerCase().replace(/\s+/g, "_");
    if (MUSCLE_KEYS.has(key)) return t(`muscles.${key}` as `muscles.${string}`);
    if (MUSCLE_KEYS.has(muscle)) return t(`muscles.${muscle}` as `muscles.${string}`);
    return muscle;
  };

  const [showInstructions, setShowInstructions] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null);

  const { data, isLoading, error } = useExerciseDemo(name, open);

  const errorMessage = error ? formatAiError(error) : null;

  useEffect(() => {
    if (!fullscreenSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreenSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreenSrc]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-5 w-5 text-muted-foreground hover:text-primary",
          triggerClassName,
        )}
        onClick={() => setOpen(true)}
      >
        <Eye className={triggerLabel ? "h-5 w-5" : "h-3.5 w-3.5"} />
        {triggerLabel && (
          <span className="text-[10px] leading-none font-medium">{triggerLabel}</span>
        )}
      </Button>

      {/* Fullscreen overlay */}
      {fullscreenSrc && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-200 bg-black/95 flex items-center justify-center"
            onClick={() => setFullscreenSrc(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullscreenSrc}
              alt={t("fullscreenAlt")}
              className="max-w-full max-h-full object-contain"
            />
            <div className="absolute top-4 right-4 p-1 rounded-full bg-white/10">
              <X className="h-6 w-6 text-white" />
            </div>
          </div>,
          document.body,
        )}

      {open && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle className="text-sm truncate">
                {name}
              </DialogTitle>
            </DialogHeader>

            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="aspect-square rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
            )}

            {data && !data.found && (
              <p className="text-center text-muted-foreground py-6 text-sm">
                {t("notFound")}
              </p>
            )}

            {data?.found && (
              <div className="space-y-4">
                {/* Media: images */}
                {data.images.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {data.images.slice(0, 2).map((url, i) => {
                        const phase = i === 0 ? t("phaseStart") : t("phaseEnd");
                        return (
                        <div
                          key={i}
                          className="relative aspect-[3/4] cursor-pointer"
                          onClick={() => setFullscreenSrc(url)}
                          title={t("fullscreenHint")}
                        >
                          <Image
                            src={url}
                            alt={t("imageAlt", { name, phase })}
                            fill
                            className="rounded-lg bg-muted object-cover"
                            sizes="(max-width: 384px) 45vw, 170px"
                          />
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {phase}
                          </span>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Overview */}
                {data.overview && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.overview}
                  </p>
                )}

                {/* Muscle groups */}
                {(data.primaryMuscles.length > 0 || data.secondaryMuscles.length > 0) && (
                  <div className="space-y-2">
                    {data.primaryMuscles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground shrink-0">{t("primaryMuscles")}</span>
                        {data.primaryMuscles.map((m) => (
                          <Badge key={m} className="text-[10px] bg-primary/20 text-primary border-primary/30">
                            {getMuscleLabel(m)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {data.secondaryMuscles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground shrink-0">{t("secondaryMuscles")}</span>
                        {data.secondaryMuscles.map((m) => (
                          <Badge key={m} variant="secondary" className="text-[10px]">
                            {getMuscleLabel(m)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Equipment */}
                {data.equipment && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{t("equipment")}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {data.equipment}
                    </Badge>
                  </div>
                )}

                {/* Instructions (collapsible) */}
                {data.instructions.length > 0 && (
                  <div>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowInstructions(!showInstructions)}
                    >
                      {showInstructions ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {t("instructions", { count: data.instructions.length })}
                    </button>
                    {showInstructions && (
                      <ol className="mt-2 space-y-1.5 pl-4 list-decimal">
                        {data.instructions.map((step, i) => (
                          <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                            {step}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {/* Tips (collapsible) */}
                {data.tips.length > 0 && (
                  <div>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowTips(!showTips)}
                    >
                      {showTips ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {t("tips", { count: data.tips.length })}
                    </button>
                    {showTips && (
                      <ul className="mt-2 space-y-1.5 pl-4 list-disc">
                        {data.tips.map((tip, i) => (
                          <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                            {tip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
