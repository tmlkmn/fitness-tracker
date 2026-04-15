"use client";

import { useState } from "react";
import { useExercises, useToggleExercise } from "@/hooks/use-exercises";
import { WorkoutSection } from "./workout-section";
import { ExerciseFormDialog } from "./exercise-form-dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Plus, Dumbbell, Trash2 } from "lucide-react";
import { AiWorkoutModal } from "./ai-workout-modal";
import { BulkDeleteExercisesDialog } from "./bulk-delete-exercises-dialog";
import {
  useGenerateWorkoutReplacement,
  useApplyWorkoutReplacement,
} from "@/hooks/use-workout-ai";

interface WorkoutListProps {
  dailyPlanId: number;
  readOnly?: boolean;
}

export function WorkoutList({ dailyPlanId, readOnly }: WorkoutListProps) {
  const { data: exerciseList, isLoading } = useExercises(dailyPlanId);
  const toggleExercise = useToggleExercise();
  const [modalOpen, setModalOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const generate = useGenerateWorkoutReplacement();
  const apply = useApplyWorkoutReplacement();

  const handleGenerate = () => {
    generate.mutate(dailyPlanId);
  };

  const handleApply = () => {
    if (!generate.data?.suggestedExercises) return;
    apply.mutate(
      { dailyPlanId, exercises: generate.data.suggestedExercises },
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
    if (open && !generate.data) {
      handleGenerate();
    }
    if (!open) {
      generate.reset();
    }
  };

  const error = generate.error
    ? generate.error.message === "RATE_LIMITED"
      ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
      : "AI özelliği şu anda kullanılamıyor. Daha sonra tekrar deneyin."
    : null;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!exerciseList?.length) {
    return (
      <>
        <div className="text-center py-8 space-y-3">
          <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
          <p className="text-sm text-muted-foreground">
            Bu gün için antrenman programı yok
          </p>
          {!readOnly && (
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleOpenChange(true)}>
                <Sparkles className="h-3.5 w-3.5" />
                AI ile Oluştur
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Manuel Ekle
              </Button>
            </div>
          )}
        </div>
        {addOpen && (
          <ExerciseFormDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            dailyPlanId={dailyPlanId}
          />
        )}
        {modalOpen && (
          <AiWorkoutModal
            open={modalOpen}
            onOpenChange={handleOpenChange}
            title="AI ile Antrenman Oluştur"
            currentExercises={[]}
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

  const sectionOrder = ["warmup", "main", "cooldown", "sauna", "swimming"];

  const sections = exerciseList.reduce(
    (acc, exercise) => {
      const key = exercise.section;
      if (!acc[key]) {
        acc[key] = { label: exercise.sectionLabel, exercises: [] };
      }
      acc[key].exercises.push(exercise);
      return acc;
    },
    {} as Record<
      string,
      { label: string; exercises: typeof exerciseList }
    >
  );

  const sortedSections = Object.entries(sections).sort(
    ([a], [b]) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b)
  );

  const totalExercises = exerciseList.length;
  const completedExercises = exerciseList.filter((e) => e.isCompleted).length;
  const percent = Math.round((completedExercises / totalExercises) * 100);

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {completedExercises}/{totalExercises} tamamlandı
            </span>
            <span className="text-sm font-medium">%{percent}</span>
          </div>
          <Progress value={percent} />
        </div>
        {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => handleOpenChange(true)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI ile Programı Değiştir
          </Button>
        )}
        {sortedSections.map(([section, { label, exercises }]) => (
          <WorkoutSection
            key={section}
            sectionLabel={label}
            section={section}
            dailyPlanId={dailyPlanId}
            exercises={exercises}
            readOnly={readOnly}
            onToggle={readOnly ? undefined : (id, completed) =>
              toggleExercise.mutate({ id, isCompleted: completed })
            }
          />
        ))}
        {!readOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Egzersiz Ekle
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Tümünü Sil
            </Button>
          </div>
        )}
      </div>

      {addOpen && (
        <ExerciseFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          dailyPlanId={dailyPlanId}
        />
      )}

      {bulkDeleteOpen && (
        <BulkDeleteExercisesDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          dailyPlanId={dailyPlanId}
          exerciseCount={exerciseList.length}
        />
      )}

      {modalOpen && (
        <AiWorkoutModal
          open={modalOpen}
          onOpenChange={handleOpenChange}
          title="AI ile Programı Değiştir"
          currentExercises={exerciseList}
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
