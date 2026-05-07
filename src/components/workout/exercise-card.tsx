"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Timer, Sparkles, Pencil, Trash2, Plus, Search } from "lucide-react";
import { ExerciseFormTips } from "./exercise-form-tips";
import { ExerciseDemoModal } from "./exercise-demo-modal";
import { ExerciseAlternativeModal } from "./exercise-alternative-modal";
import { ExerciseFormDialog } from "./exercise-form-dialog";
import { ExerciseDeleteDialog } from "./exercise-delete-dialog";
import { InlineEditBadge } from "@/components/ui/inline-edit-badge";
import { SwipeableCard } from "@/components/ui/swipeable-card";
import {
  useGenerateExerciseVariation,
  useApplyExerciseVariation,
} from "@/hooks/use-workout-ai";
import { useUpdateExercise } from "@/hooks/use-exercise-crud";
import type { AIExerciseVariation } from "@/actions/ai-workout";
import { formatAiError } from "@/lib/ai-errors";

interface ExerciseCardProps {
  id: number;
  name: string;
  englishName?: string | null;
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
  englishName,
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
  const updateExercise = useUpdateExercise();

  const handleGenerate = (userNote?: string, forceRefresh?: boolean) => {
    if (!dailyPlanId) return;
    generate.mutate({ exerciseId: id, dailyPlanId, userNote, forceRefresh });
  };

  const handleApply = (alternative: AIExerciseVariation) => {
    apply.mutate(
      { exerciseId: id, exercise: alternative },
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
    if (!open) generate.reset();
  };

  const error = generate.error ? formatAiError(generate.error) : null;

  const cardElement = (
    <Card className="transition-opacity">
      <CardContent className="p-3 pb-2">
        <div className={cn("flex items-start gap-3", isCompleted && "opacity-60")}>
          {!readOnly && (
            <Checkbox
              checked={isCompleted}
              onCheckedChange={(checked) => onToggle?.(id, !!checked)}
              className="mt-0.5"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium text-sm", isCompleted && "line-through")}>
              {name}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {sets && reps ? (
                <>
                  {!readOnly && !isCompleted ? (
                    <InlineEditBadge
                      value={`${sets}x${reps}`}
                      onSave={(v) => {
                        const match = v.match(/^(\d+)x(.+)$/);
                        if (match) {
                          updateExercise.mutate({
                            exerciseId: id,
                            data: { section, sectionLabel, name, sets: parseInt(match[1]), reps: match[2], restSeconds, durationMinutes, notes },
                          });
                        }
                      }}
                    />
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {sets}x{reps}
                    </Badge>
                  )}
                  {!readOnly && !isCompleted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() =>
                        updateExercise.mutate({
                          exerciseId: id,
                          data: { section, sectionLabel, name, sets: (sets ?? 0) + 1, reps, restSeconds, durationMinutes, notes },
                        })
                      }
                      title="+1 Set"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </>
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
              <p className={cn("text-xs text-yellow-500 mt-1", isCompleted && "line-through")}>{notes}</p>
            ) : null}
          </div>
          {!readOnly && !isCompleted && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      <div className="border-t border-border/40 flex items-stretch px-1 pb-1">
        <ExerciseDemoModal
          name={name}
          triggerClassName="flex-col h-11 w-auto px-3 gap-0.5"
          triggerLabel="Demo"
        />
        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(englishName || name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center h-11 px-3 gap-0.5 rounded-md hover:bg-accent transition-colors text-muted-foreground"
          title="Google'da Ara"
        >
          <Search className="h-5 w-5" />
          <span className="text-[10px] leading-none font-medium">Ara</span>
        </a>
        {!readOnly && (
          <ExerciseFormTips
            name={name}
            notes={notes}
            englishName={englishName}
            triggerClassName="flex-col h-11 w-auto px-3 gap-0.5"
            triggerLabel="Form"
          />
        )}
        {!readOnly && !isCompleted && dailyPlanId && (
          <Button
            variant="ghost"
            className="flex flex-col h-11 px-3 gap-0.5 text-primary ml-auto"
            onClick={() => handleOpenChange(true)}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px] leading-none font-medium">Alternatif</span>
          </Button>
        )}
      </div>
    </Card>
  );

  return (
    <>
      {!readOnly ? (
        <SwipeableCard
          onSwipeLeft={() => setDeleteOpen(true)}
          onSwipeRight={() => onToggle?.(id, !isCompleted)}
        >
          {cardElement}
        </SwipeableCard>
      ) : (
        cardElement
      )}

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

      {modalOpen && dailyPlanId && (
        <ExerciseAlternativeModal
          open={modalOpen}
          onOpenChange={handleOpenChange}
          exerciseName={name}
          alternatives={generate.data?.alternatives ?? null}
          loading={generate.isPending}
          applying={apply.isPending}
          error={error}
          fromCache={generate.data?.fromCache ?? false}
          onGenerate={handleGenerate}
          onApply={handleApply}
        />
      )}
    </>
  );
}
