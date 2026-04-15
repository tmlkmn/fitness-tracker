"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { useExerciseDemo } from "@/hooks/use-exercise-demo";

interface ExerciseDemoModalProps {
  name: string;
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
};

function getMuscleLabel(muscle: string): string {
  return muscleLabels[muscle] ?? muscle;
}

export function ExerciseDemoModal({ name }: ExerciseDemoModalProps) {
  const [open, setOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const { data, isLoading, error } = useExerciseDemo(name, open);

  const errorMessage = error
    ? error.message === "RATE_LIMITED"
      ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
      : "Demo yüklenirken bir hata oluştu."
    : null;

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
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="aspect-[3/4] rounded-lg" />
                  <Skeleton className="aspect-[3/4] rounded-lg" />
                </div>
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
                {/* Images: start + end position */}
                {data.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {data.images.slice(0, 2).map((url, i) => (
                      <div key={i} className="relative aspect-[3/4]">
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
                )}

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
