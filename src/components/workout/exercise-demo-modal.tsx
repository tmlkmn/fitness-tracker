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

interface ExerciseDemoModalProps {
  name: string;
  englishName?: string | null;
}

const muscleLabels: Record<string, string> = {
  abdominals: "Karın",
  abductors: "Kalça Dış",
  adductors: "Kalça İç",
  biceps: "Biceps",
  calves: "Baldır",
  chest: "Göğüs",
  forearms: "Ön Kol",
  glutes: "Kalça",
  hamstrings: "Arka Bacak",
  lats: "Sırt (Lat)",
  lower_back: "Alt Sırt",
  middle_back: "Orta Sırt",
  neck: "Boyun",
  quadriceps: "Ön Bacak",
  shoulders: "Omuz",
  traps: "Trapez",
  triceps: "Triceps",
  pectorals: "Göğüs",
  delts: "Omuz",
  serratus_anterior: "Ön Dişli Kas",
  abs: "Karın",
  cardiovascular_system: "Kardiyovasküler",
  levator_scapulae: "Kürek Kaldırıcı",
  spine: "Omurga",
};

function getMuscleLabel(muscle: string): string {
  const key = muscle.toLowerCase().replace(/\s+/g, "_");
  return muscleLabels[key] ?? muscleLabels[muscle] ?? muscle;
}

export function ExerciseDemoModal({ name, englishName }: ExerciseDemoModalProps) {
  const [open, setOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null);

  const { data, isLoading, error } = useExerciseDemo(name, open, englishName);

  const errorMessage = error
    ? error.message === "RATE_LIMITED"
      ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
      : "Demo yüklenirken bir hata oluştu."
    : null;

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
        className="h-5 w-5 text-muted-foreground hover:text-primary"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>

      {/* Fullscreen overlay — portal'a render edilerek stacking context'ten çıkar */}
      {fullscreenSrc && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-200 bg-black/95 flex items-center justify-center"
            onClick={() => setFullscreenSrc(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fullscreenSrc}
              alt="Tam ekran görsel"
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
                Bu egzersiz için görsel bulunamadı.
              </p>
            )}

            {data?.found && (
              <div className="space-y-4">
                {/* GIF (ExerciseDB) or static images (fallback) */}
                {data.gifUrl ? (
                  <div
                    className="relative w-full cursor-pointer"
                    onClick={() => setFullscreenSrc(data.gifUrl!)}
                    title="Tam ekran için tıkla"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.gifUrl}
                      alt={`${name} — egzersiz animasyonu`}
                      className="w-full rounded-lg bg-muted"
                      loading="lazy"
                    />
                  </div>
                ) : data.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {data.images.slice(0, 2).map((url, i) => (
                      <div
                        key={i}
                        className="relative aspect-[3/4] cursor-pointer"
                        onClick={() => setFullscreenSrc(url)}
                        title="Tam ekran için tıkla"
                      >
                        <Image
                          src={url}
                          alt={`${name} - ${i === 0 ? "başlangıç" : "bitiş"} pozisyonu`}
                          fill
                          className="rounded-lg bg-muted object-cover"
                          sizes="(max-width: 384px) 45vw, 170px"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {i === 0 ? "Başlangıç" : "Bitiş"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Muscle groups */}
                {(data.primaryMuscles.length > 0 || data.secondaryMuscles.length > 0) && (
                  <div className="space-y-2">
                    {data.primaryMuscles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground shrink-0">Hedef:</span>
                        {data.primaryMuscles.map((m) => (
                          <Badge key={m} className="text-[10px] bg-primary/20 text-primary border-primary/30">
                            {getMuscleLabel(m)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {data.secondaryMuscles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground shrink-0">Yardımcı:</span>
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
                    <span className="text-xs text-muted-foreground">Ekipman:</span>
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
                      Nasıl Yapılır ({data.instructions.length} adım)
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
