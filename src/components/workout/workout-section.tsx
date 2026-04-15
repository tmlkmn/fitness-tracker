"use client";

import { useState } from "react";
import { ExerciseCard } from "./exercise-card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { getSectionIcon, DynamicIcon } from "@/lib/icon-map";
import { AiWorkoutModal } from "./ai-workout-modal";
import {
  useGenerateSectionReplacement,
  useApplySectionReplacement,
} from "@/hooks/use-workout-ai";

interface Exercise {
  id: number;
  section: string;
  sectionLabel: string;
  name: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  isCompleted: boolean | null;
  sortOrder: number;
}

interface WorkoutSectionProps {
  sectionLabel: string;
  section: string;
  dailyPlanId: number;
  exercises: Exercise[];
  onToggle?: (id: number, isCompleted: boolean) => void;
  readOnly?: boolean;
}

export function WorkoutSection({
  sectionLabel,
  section,
  dailyPlanId,
  exercises,
  onToggle,
  readOnly,
}: WorkoutSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const generate = useGenerateSectionReplacement();
  const apply = useApplySectionReplacement();

  const handleGenerate = (userNote?: string) => {
    generate.mutate({ dailyPlanId, section, sectionLabel, userNote });
  };

  const handleApply = () => {
    if (!generate.data?.suggestedExercises) return;
    apply.mutate(
      { dailyPlanId, section, exercises: generate.data.suggestedExercises },
      {
        onSuccess: () => {
          setModalOpen(false);
          generate.reset();
        },
      },
    );
  };

  const handleOpenChange = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      generate.reset();
    }
  };

  const error = generate.error
    ? generate.error.message === "RATE_LIMITED"
      ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
      : "AI özelliği şu anda kullanılamıyor. Daha sonra tekrar deneyin."
    : null;

  const sectionIcon = getSectionIcon(section);

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DynamicIcon icon={sectionIcon} className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            {sectionLabel}
          </span>
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0"
              onClick={() => handleOpenChange(true)}
            >
              <Sparkles className="h-3 w-3 text-primary" />
            </Button>
          )}
          <Separator className="flex-1" />
        </div>
        <div className="space-y-2">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              {...exercise}
              isCompleted={exercise.isCompleted ?? false}
              onToggle={onToggle}
              readOnly={readOnly}
              dailyPlanId={dailyPlanId}
            />
          ))}
        </div>
      </div>

      {modalOpen && (
        <AiWorkoutModal
          open={modalOpen}
          onOpenChange={handleOpenChange}
          title={`AI ile ${sectionLabel} Değiştir`}
          currentExercises={exercises}
          suggestedExercises={generate.data?.suggestedExercises ?? null}
          loading={generate.isPending}
          applying={apply.isPending}
          error={error}
          onGenerate={handleGenerate}
          onApply={handleApply}
        />
      )}
    </>
  );
}
