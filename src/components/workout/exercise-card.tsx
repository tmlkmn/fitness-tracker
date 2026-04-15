"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Timer, Sparkles, Pencil, Trash2 } from "lucide-react";
import { ExerciseFormTips } from "./exercise-form-tips";
import { ExerciseDemoModal } from "./exercise-demo-modal";
import { AiWorkoutModal } from "./ai-workout-modal";
import { ExerciseFormDialog } from "./exercise-form-dialog";
import { ExerciseDeleteDialog } from "./exercise-delete-dialog";
import {
  useGenerateExerciseVariation,
  useApplyExerciseVariation,
} from "@/hooks/use-workout-ai";

interface ExerciseCardProps {
  id: number;
  name: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  isCompleted: boolean;
  section: string;
  sectionLabel: string;
  onToggle?: (id: number, isCompleted: boolean) => void;
  readOnly?: boolean;
  dailyPlanId?: number | null;
}

export function ExerciseCard({
  id,
  name,
  sets,
  reps,
  restSeconds,
  durationMinutes,
  notes,
  isCompleted,
  section,
  sectionLabel,
  onToggle,
  readOnly,
  dailyPlanId,
}: ExerciseCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const generate = useGenerateExerciseVariation();
  const apply = useApplyExerciseVariation();

  const handleGenerate = () => {
    if (!dailyPlanId) return;
    generate.mutate({ exerciseId: id, dailyPlanId });
  };

  const handleApply = () => {
    if (!generate.data?.suggestedExercise) return;
    apply.mutate(
      { exerciseId: id, exercise: generate.data.suggestedExercise },
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

  return (
    <>
      <Card className={cn("transition-opacity", isCompleted && "opacity-60")}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            {!readOnly && (
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => onToggle?.(id, !!checked)}
                className="mt-0.5"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className={cn("font-medium text-sm", isCompleted && "line-through")}>
                  {name}
                </p>
                <ExerciseDemoModal name={name} />
                {!readOnly && <ExerciseFormTips name={name} notes={notes} />}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {sets && reps ? (
                  <Badge variant="secondary" className="text-xs">
                    {sets}x{reps}
                  </Badge>
                ) : null}
                {durationMinutes ? (
                  <Badge variant="secondary" className="text-xs">
                    {durationMinutes} dk
                  </Badge>
                ) : null}
                {restSeconds ? (
                  <Badge variant="outline" className="text-xs">
                    <Timer className="h-3 w-3 mr-1" />
                    {restSeconds}sn
                  </Badge>
                ) : null}
              </div>
              {notes ? (
                <p className="text-xs text-yellow-500 mt-1">{notes}</p>
              ) : null}
            </div>
            {!readOnly && !isCompleted && (
              <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
                {dailyPlanId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleOpenChange(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {editOpen && dailyPlanId && (
        <ExerciseFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          dailyPlanId={dailyPlanId}
          exercise={{ id, section, sectionLabel, name, sets, reps, restSeconds, durationMinutes, notes }}
        />
      )}

      {deleteOpen && (
        <ExerciseDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          exerciseId={id}
          exerciseName={name}
        />
      )}

      {modalOpen && (
        <AiWorkoutModal
          open={modalOpen}
          onOpenChange={handleOpenChange}
          title="AI ile Hareketi Değiştir"
          currentExercises={[{ name, sets, reps, restSeconds, durationMinutes, notes, section, sectionLabel }]}
          suggestedExercises={
            generate.data?.suggestedExercise
              ? [{ ...generate.data.suggestedExercise, section, sectionLabel }]
              : null
          }
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
