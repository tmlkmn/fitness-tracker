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
import { Sparkles, RefreshCw, Check, AlertCircle, Timer, MessageSquare, Home, Building2 } from "lucide-react";
import type { AIExercise } from "@/actions/ai-workout";
import { useState } from "react";

const EQUIPMENT_OPTIONS = [
  "Dumbbell",
  "Barbell",
  "Direnç bandı",
  "Pull-up bar",
  "Kettlebell",
  "TRX",
  "Yoga matı",
  "Bench",
  "Hiçbiri (vücut ağırlığı)",
];

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
  onGenerate: (userNote?: string) => void;
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
  const [userNote, setUserNote] = useState("");
  const [location, setLocation] = useState<"gym" | "home">("gym");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  };

  const hasMultipleSections =
    suggestedExercises &&
    new Set(suggestedExercises.map((e) => e.sectionLabel)).size > 1;

  const handleGenerate = () => {
    const parts: string[] = [];
    if (location === "home") {
      parts.push(`Antrenman yeri: Ev. Mevcut ekipman: ${selectedEquipment.length > 0 ? selectedEquipment.join(", ") : "Vücut ağırlığı"}`);
    } else {
      parts.push("Antrenman yeri: Salon (tüm ekipman mevcut)");
    }
    const note = userNote.trim();
    if (note) parts.push(note);
    onGenerate(parts.join(". "));
  };

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
          {/* Current program — always show */}
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

          {/* Phase 1: User input */}
          {!loading && !suggestedExercises && (
            <div className="space-y-3">
              {/* Location selection */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Antrenman yeri:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocation("gym")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                      location === "gym"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Salon
                  </button>
                  <button
                    onClick={() => setLocation("home")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                      location === "home"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Home className="h-3.5 w-3.5" />
                    Ev
                  </button>
                </div>
              </div>

              {/* Equipment selection (home only) */}
              {location === "home" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Mevcut ekipman:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {EQUIPMENT_OPTIONS.map((eq) => {
                      const isSelected = selectedEquipment.includes(eq);
                      return (
                        <button
                          key={eq}
                          onClick={() => toggleEquipment(eq)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {eq}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Bu antrenman için özel bir isteğin var mı?
                </p>
              </div>
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={2}
                placeholder="Örn: Ağırlıkları artır, daha fazla süperset ekle, omuz hareketlerini değiştir..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Öneri Al
              </Button>
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

          {/* Phase 2: Suggested program */}
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

          {/* Phase 2 buttons */}
          {!loading && suggestedExercises && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={loading || applying}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Yeni Öneri
              </Button>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
