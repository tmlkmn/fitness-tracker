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
import {
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  MessageSquare,
  Home,
  Building2,
  Database,
} from "lucide-react";
import { useState } from "react";
import type { AIExerciseVariation } from "@/actions/ai-workout";
import { ExerciseDemoModal } from "./exercise-demo-modal";
import { AiQuotaBadge } from "@/components/ai/ai-quota-badge";
import { loadWorkoutPrefs, saveWorkoutPrefs } from "@/lib/workout-prefs";
import { useTranslations } from "next-intl";

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

interface ExerciseAlternativeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  alternatives: AIExerciseVariation[] | null;
  loading: boolean;
  applying: boolean;
  error: string | null;
  fromCache: boolean;
  onGenerate: (userNote?: string, forceRefresh?: boolean) => void;
  onApply: (alternative: AIExerciseVariation) => void;
}

function AlternativeBadges({ ex }: { ex: AIExerciseVariation }) {
  const t = useTranslations("workout.aiModal");
  return (
    <div className="flex gap-1 flex-wrap">
      {ex.sets && ex.reps ? (
        <Badge variant="secondary" className="text-[10px]">
          {ex.sets}×{ex.reps}
        </Badge>
      ) : null}
      {ex.durationMinutes ? (
        <Badge variant="secondary" className="text-[10px]">
          {ex.durationMinutes} {t("minutesShort")}
        </Badge>
      ) : null}
      {ex.restSeconds ? (
        <Badge variant="outline" className="text-[10px]">
          {ex.restSeconds}{t("secondsShort")}
        </Badge>
      ) : null}
    </div>
  );
}

export function ExerciseAlternativeModal({
  open,
  onOpenChange,
  exerciseName,
  alternatives,
  loading,
  applying,
  error,
  fromCache,
  onGenerate,
  onApply,
}: ExerciseAlternativeModalProps) {
  const t = useTranslations("exercises.alternativeModal");
  const tEquipment = useTranslations("workout.aiModal");
  const [userNote, setUserNote] = useState("");
  const [location, setLocation] = useState<"gym" | "home">(() => loadWorkoutPrefs().location);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() => loadWorkoutPrefs().equipment);
  const [selected, setSelected] = useState<number | null>(null);

  const toggleEquipment = (eq: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  };

  const buildNote = () => {
    const parts: string[] = [];
    if (location === "home") {
      const equipmentList =
        selectedEquipment.length > 0
          ? selectedEquipment
              .map((eq) =>
                tEquipment(
                  `equipment.${eq}` as `equipment.${typeof EQUIPMENT_OPTIONS[number]}`,
                ),
              )
              .join(", ")
          : t("bodyweight");
      parts.push(`${t("locationHomePromptPrefix")} ${equipmentList}`);
    } else {
      parts.push(t("locationGymPrompt"));
    }
    const note = userNote.trim();
    if (note) parts.push(note);
    return parts.join(". ");
  };

  const handleGenerate = (forceRefresh = false) => {
    saveWorkoutPrefs({ location, equipment: selectedEquipment });
    setSelected(null);
    onGenerate(buildNote(), forceRefresh);
  };

  const handleApply = () => {
    if (selected === null || !alternatives) return;
    onApply(alternatives[selected]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate">{exerciseName}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {!loading && !alternatives && (
            <div className="space-y-3">
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
                          {tEquipment(`equipment.${eq}` as `equipment.${typeof EQUIPMENT_OPTIONS[number]}`)}
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
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={2}
                placeholder={t("specialRequestPlaceholder")}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <Button
                onClick={() => handleGenerate(false)}
                disabled={loading}
                className="w-full gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                {t("getSuggestion")}
                <AiQuotaBadge feature="workout" />
              </Button>
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <p className="text-xs text-primary font-medium">
                {t("generating")}
              </p>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!loading && alternatives && alternatives.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">
                  {t("alternativesCount")}
                </p>
                {fromCache && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Database className="h-2.5 w-2.5" />
                    {t("fromCache")}
                  </Badge>
                )}
              </div>

              {alternatives.map((alt, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selected === i
                      ? "bg-primary/10 border-primary/40"
                      : "bg-muted/40 border-transparent hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alt.name}</p>
                      {alt.notes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {alt.notes}
                        </p>
                      )}
                      <div className="mt-1.5">
                        <AlternativeBadges ex={alt} />
                      </div>
                    </div>
                    <div
                      className="shrink-0 mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExerciseDemoModal name={alt.name} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && alternatives && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleGenerate(true)}
                disabled={loading || applying}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {t("newSuggestion")}
              </Button>
              <Button
                onClick={handleApply}
                disabled={loading || applying || selected === null}
                className="flex-1"
              >
                {applying ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {t("apply")}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
