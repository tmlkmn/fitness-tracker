"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, Check, AlertCircle, Timer } from "lucide-react";
import type { AIExercise } from "@/actions/ai-workout";

interface ExerciseDisplay {
  name: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  section?: string;
  sectionLabel?: string;
}

interface AiWorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  currentExercises: ExerciseDisplay[];
  suggestedExercises: AIExercise[] | ExerciseDisplay[] | null;
  loading: boolean;
  applying: boolean;
  error: string | null;
  onGenerate: () => void;
  onApply: () => void;
}

function ExerciseRow({ ex }: { ex: ExerciseDisplay }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <p className="text-sm font-medium flex-1 min-w-0 break-words">{ex.name}</p>
      <div className="flex gap-1 shrink-0 flex-wrap justify-end">
        {ex.sets && ex.reps ? (
          <Badge variant="secondary" className="text-[10px]">
            {ex.sets}x{ex.reps}
          </Badge>
        ) : null}
        {ex.durationMinutes ? (
          <Badge variant="secondary" className="text-[10px]">
            {ex.durationMinutes} dk
          </Badge>
        ) : null}
        {ex.restSeconds ? (
          <Badge variant="outline" className="text-[10px]">
            <Timer className="h-2.5 w-2.5 mr-0.5" />
            {ex.restSeconds}sn
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function ExerciseList({
  exercises,
  grouped,
}: {
  exercises: ExerciseDisplay[];
  grouped?: boolean;
}) {
  if (!grouped) {
    return (
      <div className="divide-y divide-border">
        {exercises.map((ex, i) => (
          <ExerciseRow key={i} ex={ex} />
        ))}
      </div>
    );
  }

  // Group by sectionLabel
  const sections: Record<string, ExerciseDisplay[]> = {};
  for (const ex of exercises) {
    const label = ex.sectionLabel ?? "Egzersizler";
    if (!sections[label]) sections[label] = [];
    sections[label].push(ex);
  }

  return (
    <div className="space-y-3">
      {Object.entries(sections).map(([label, exs]) => (
        <div key={label}>
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
            {label}
          </p>
          <div className="divide-y divide-border">
            {exs.map((ex, i) => (
              <ExerciseRow key={i} ex={ex} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AiWorkoutModal({
  open,
  onOpenChange,
  title,
  currentExercises,
  suggestedExercises,
  loading,
  applying,
  error,
  onGenerate,
  onApply,
}: AiWorkoutModalProps) {
  const hasMultipleSections =
    suggestedExercises &&
    new Set(suggestedExercises.map((e) => e.sectionLabel)).size > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current program */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Mevcut Program
            </p>
            {currentExercises.length > 0 ? (
              <ExerciseList
                exercises={currentExercises}
                grouped={
                  new Set(currentExercises.map((e) => e.sectionLabel)).size > 1
                }
              />
            ) : (
              <p className="text-xs text-muted-foreground">Egzersiz yok</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <p className="text-xs text-primary mb-2 font-medium">
                AI öneri oluşturuyor...
              </p>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}

          {/* Suggested program */}
          {!loading && suggestedExercises && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-primary mb-2 font-medium">
                Önerilen Program
              </p>
              <ExerciseList
                exercises={suggestedExercises}
                grouped={!!hasMultipleSections}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onGenerate}
              disabled={loading || applying}
              className="flex-1"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {suggestedExercises ? "Yeni Öneri" : "Öneri Al"}
            </Button>
            {suggestedExercises && (
              <Button
                onClick={onApply}
                disabled={loading || applying}
                className="flex-1"
              >
                {applying ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Onayla
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
