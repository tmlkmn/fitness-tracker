"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, Check, AlertCircle, Timer, MessageSquare, Home, Building2 } from "lucide-react";
import type { AIExercise } from "@/actions/ai-workout";
import { useState, useEffect } from "react";
import { loadWorkoutPrefs, saveWorkoutPrefs } from "@/lib/workout-prefs";
import { AiGeneratingOverlay, type GeneratingStep } from "@/components/ai/ai-generating-overlay";
import { MeasurementNudge } from "@/components/ai/measurement-nudge";
import { useTranslations } from "next-intl";
import { buildAiUserNote } from "@/lib/ai-user-note";
import { AiNoteTextarea } from "@/components/ai/ai-note-textarea";

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
] as const;

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
  const t = useTranslations("workout.aiModal");
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
            {ex.durationMinutes} {t("minutesShort")}
          </Badge>
        ) : null}
        {ex.restSeconds ? (
          <Badge variant="outline" className="text-[10px]">
            <Timer className="h-2.5 w-2.5 mr-0.5" />
            {ex.restSeconds}{t("secondsShort")}
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
  const t = useTranslations("workout.aiModal");
  if (!grouped) {
    return (
      <div className="divide-y divide-border">
        {exercises.map((ex, i) => (
          <ExerciseRow key={i} ex={ex} />
        ))}
      </div>
    );
  }

  const sections: Record<string, ExerciseDisplay[]> = {};
  for (const ex of exercises) {
    const label = ex.sectionLabel ?? t("exercisesSection");
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
  const t = useTranslations("workout.aiModal");
  const [userNote, setUserNote] = useState("");
  const [location, setLocation] = useState<"gym" | "home">(() => loadWorkoutPrefs().location);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() => loadWorkoutPrefs().equipment);
  const [profileDone, setProfileDone] = useState(false);

  useEffect(() => {
    if (!loading) { setProfileDone(false); return; }
    const tm = setTimeout(() => setProfileDone(true), 1200);
    return () => clearTimeout(tm);
  }, [loading]);

  const workoutOverlaySteps: GeneratingStep[] = [
    { label: t("stepProfile"), status: profileDone ? "completed" : loading ? "active" : "pending" },
    { label: t("stepPlan"), status: loading && profileDone ? "active" : "pending" },
  ];

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  };

  const hasMultipleSections =
    suggestedExercises &&
    new Set(suggestedExercises.map((e) => e.sectionLabel)).size > 1;

  const handleGenerate = () => {
    saveWorkoutPrefs({ location, equipment: selectedEquipment });
    let locationPart: string;
    if (location === "home") {
      const equipmentList =
        selectedEquipment.length > 0
          ? selectedEquipment
              .map((eq) => t(`equipment.${eq}` as `equipment.${typeof EQUIPMENT_OPTIONS[number]}`))
              .join(", ")
          : t("bodyweight");
      locationPart = `${t("locationHomePromptPrefix")} ${equipmentList}`;
    } else {
      locationPart = t("locationGymPrompt");
    }
    onGenerate(buildAiUserNote([locationPart, userNote]));
  };

  return (
    <>
      <AiGeneratingOverlay
        open={loading}
        title={t("overlayTitle")}
        steps={workoutOverlaySteps}
      />
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[95svh] h-[95svh] overflow-y-auto overflow-x-hidden">
        <SheetHeader sticky>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              {t("currentProgram")}
            </p>
            {currentExercises.length > 0 ? (
              <ExerciseList
                exercises={currentExercises}
                grouped={
                  new Set(currentExercises.map((e) => e.sectionLabel)).size > 1
                }
              />
            ) : (
              <p className="text-xs text-muted-foreground">{t("noExercises")}</p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !suggestedExercises && (
            <div className="space-y-3">
              <MeasurementNudge />
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  {t("trainingLocation")}
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
                    {t("gym")}
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
                    {t("home")}
                  </button>
                </div>
              </div>

              {location === "home" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("availableEquipment")}
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
                          {t(`equipment.${eq}` as `equipment.${typeof EQUIPMENT_OPTIONS[number]}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {t("specialRequest")}
                </p>
              </div>
              <AiNoteTextarea
                value={userNote}
                onChange={setUserNote}
                placeholder={t("specialRequestPlaceholder")}
              />
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t("getSuggestion")}
              </Button>
            </div>
          )}

          {loading && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <p className="text-xs text-primary mb-2 font-medium">
                {t("generating")}
              </p>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}

          {!loading && suggestedExercises && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-primary mb-2 font-medium">
                {t("suggestedProgram")}
              </p>
              <ExerciseList
                exercises={suggestedExercises}
                grouped={!!hasMultipleSections}
              />
            </div>
          )}

          {!loading && suggestedExercises && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={loading || applying}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t("newSuggestion")}
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
                {t("approve")}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
