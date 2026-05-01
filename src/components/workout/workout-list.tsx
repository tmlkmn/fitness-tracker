"use client";

import { useState } from "react";
import { useExercises, useToggleExercise } from "@/hooks/use-exercises";
import { WorkoutSection } from "./workout-section";
import { ExerciseFormDialog } from "./exercise-form-dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Plus, Dumbbell, Trash2, Copy, CheckCheck, ArrowRightLeft } from "lucide-react";
import { AiWorkoutModal } from "./ai-workout-modal";
import { BulkDeleteExercisesDialog } from "./bulk-delete-exercises-dialog";
import { CopyWorkoutDialog } from "./copy-workout-dialog";
import { MoveDayContentsDialog } from "./move-day-contents-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { BulkCompleteDialog } from "@/components/ui/bulk-complete-dialog";
import { useBulkCompleteExercises } from "@/hooks/use-bulk-completion";
import {
  useGenerateWorkoutReplacement,
  useApplyWorkoutReplacement,
} from "@/hooks/use-workout-ai";
import { useAiQuota, useInvalidateAiQuota, getQuota } from "@/hooks/use-ai-quota";
import { AiQuotaBadge } from "@/components/ai/ai-quota-badge";
import { useMonthGate } from "@/hooks/use-month-gate";
import { MonthGateWarning } from "@/components/ai/month-gate-warning";
import { formatAiError } from "@/lib/ai-errors";

interface WorkoutListProps {
  dailyPlanId: number;
  readOnly?: boolean;
  planDate?: string;
  workoutTitle?: string | null;
}

export function WorkoutList({ dailyPlanId, readOnly, planDate, workoutTitle }: WorkoutListProps) {
  const { data: exerciseList, isLoading } = useExercises(dailyPlanId);
  const toggleExercise = useToggleExercise();
  const [modalOpen, setModalOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [bulkCompleteOpen, setBulkCompleteOpen] = useState(false);
  const bulkComplete = useBulkCompleteExercises();
  const generate = useGenerateWorkoutReplacement();
  const apply = useApplyWorkoutReplacement();
  const { data: quotaData } = useAiQuota();
  const invalidateQuota = useInvalidateAiQuota();
  const workoutQuota = getQuota(quotaData, "workout");
  const monthGate = useMonthGate();
  const isMonthBlocked = planDate ? monthGate.isBlockedForDate(planDate) : false;

  const handleGenerate = (userNote?: string) => {
    generate.mutate({ dailyPlanId, userNote });
    invalidateQuota();
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
    if (!open) {
      generate.reset();
    }
  };

  const error = generate.error ? formatAiError(generate.error) : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-10" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        {[...Array(2)].map((_, s) => (
          <div key={s} className="space-y-2">
            <Skeleton className="h-3.5 w-20" />
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/60 bg-card p-3 flex gap-3 items-center"
              >
                <Skeleton className="h-5 w-5 rounded shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!exerciseList?.length) {
    return (
      <>
        {isMonthBlocked && monthGate.ready && (
          <div className="mb-3">
            <MonthGateWarning
              currentMonthLabel={monthGate.currentMonthLabel}
              emptyWeekCount={monthGate.emptyWeeksInCurrentMonth.length}
              compact
            />
          </div>
        )}
        <EmptyState
          icon={Dumbbell}
          title="Bu gün için antrenman programı yok"
          description={
            readOnly
              ? "Geçmiş bir gün görüntülüyorsun."
              : "AI ile saniyeler içinde oluştur veya geçen haftadan kopyala."
          }
          action={
            !readOnly && !isMonthBlocked && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => handleOpenChange(true)}
                disabled={workoutQuota?.remaining === 0}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI ile Oluştur
                <AiQuotaBadge feature="workout" />
              </Button>
            )
          }
          secondaryAction={
            !readOnly && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setCopyOpen(true)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Geçen Haftadan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Manuel Ekle
                </Button>
              </>
            )
          }
        />
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
        {copyOpen && (
          <CopyWorkoutDialog
            open={copyOpen}
            onOpenChange={setCopyOpen}
            dailyPlanId={dailyPlanId}
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
        {workoutTitle && (
          <div className="rounded-xl bg-linear-to-br from-primary/15 to-primary/5 border border-primary/20 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Bugünün Antrenmanı</p>
              <p className="text-sm font-semibold leading-tight mt-0.5">{workoutTitle}</p>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground tabular-nums">
              {completedExercises}/{totalExercises} tamamlandı
            </span>
            <div className="flex items-center gap-2">
              {!readOnly && completedExercises < totalExercises && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => setBulkCompleteOpen(true)}
                  disabled={bulkComplete.isPending}
                >
                  <CheckCheck className="h-3 w-3" />
                  Tümünü Tamamla
                </Button>
              )}
              <span className="text-sm font-medium tabular-nums">%{percent}</span>
            </div>
          </div>
          <Progress value={percent} />
        </div>
        {!readOnly && isMonthBlocked && monthGate.ready && (
          <MonthGateWarning
            currentMonthLabel={monthGate.currentMonthLabel}
            emptyWeekCount={monthGate.emptyWeeksInCurrentMonth.length}
            compact
          />
        )}
        {false && !readOnly && !isMonthBlocked && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => handleOpenChange(true)}
            disabled={workoutQuota?.remaining === 0}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI ile Programı Değiştir
            <AiQuotaBadge feature="workout" />
          </Button>
        )}
        <div className="stagger-list space-y-4">
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
        </div>
        {!readOnly ? (
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
              className="gap-1.5"
              onClick={() => setCopyOpen(true)}
              title="Geçen haftadan kopyala"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setMoveOpen(true)}
              title="Başka güne taşı"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setBulkDeleteOpen(true)}
              title="Tümünü sil"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={() => setMoveOpen(true)}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Bugüne veya İleri Güne Taşı
          </Button>
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

      {bulkCompleteOpen && (
        <BulkCompleteDialog
          open={bulkCompleteOpen}
          onOpenChange={setBulkCompleteOpen}
          onConfirm={() => bulkComplete.mutate(dailyPlanId)}
          isPending={bulkComplete.isPending}
          itemCount={totalExercises - completedExercises}
          itemLabel="egzersiz"
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

      {copyOpen && (
        <CopyWorkoutDialog
          open={copyOpen}
          onOpenChange={setCopyOpen}
          dailyPlanId={dailyPlanId}
        />
      )}

      {moveOpen && (
        <MoveDayContentsDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          sourceDailyPlanId={dailyPlanId}
          defaultIncludeWorkout={true}
          defaultIncludeMeals={false}
        />
      )}
    </>
  );
}
