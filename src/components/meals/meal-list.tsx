"use client";

import { useMemo, useState } from "react";
import { useMeals, useToggleMeal } from "@/hooks/use-meals";
import { MealCard } from "./meal-card";
import { MealFormDialog } from "./meal-form-dialog";
import { DailyMacroSummary } from "./daily-macro-summary";
import { AiMealModal } from "./ai-meal-modal";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Sparkles, UtensilsCrossed, Trash2, CheckCheck, ArrowRightLeft } from "lucide-react";
import { BulkDeleteMealsDialog } from "./bulk-delete-meals-dialog";
import { MoveDayContentsDialog } from "@/components/workout/move-day-contents-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { BulkCompleteDialog } from "@/components/ui/bulk-complete-dialog";
import { useBulkCompleteMeals } from "@/hooks/use-bulk-completion";
import { useGenerateDailyMeals, useApplyDailyMeals } from "@/hooks/use-meal-ai";
import { AiQuotaBadge } from "@/components/ai/ai-quota-badge";
import { useAiQuota, getQuota } from "@/hooks/use-ai-quota";
import { useUserProfile } from "@/hooks/use-user";
import { computeMealMacros } from "@/lib/meal-macros";
import { resolveTargets } from "@/lib/macro-targets";
import { formatAiError } from "@/lib/ai-errors";
import type { AIMeal } from "@/actions/ai-meals";

interface MealListProps {
  dailyPlanId: number;
  readOnly?: boolean;
  planDate?: string;
  dailyPlanType?: string;
}

export function MealList({ dailyPlanId, readOnly, planDate, dailyPlanType }: MealListProps) {
  const { data: mealList, isLoading } = useMeals(dailyPlanId);
  const toggleMeal = useToggleMeal();
  const [addOpen, setAddOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkCompleteOpen, setBulkCompleteOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const bulkComplete = useBulkCompleteMeals();

  const generateMeals = useGenerateDailyMeals();
  const applyMeals = useApplyDailyMeals();
  const { data: quotaData } = useAiQuota();
  const dailyMealQuota = getQuota(quotaData, "daily-meal");
  const isDailyMealExhausted = dailyMealQuota !== null && dailyMealQuota.remaining <= 0;
  const { data: profile } = useUserProfile();
  const targets = useMemo(() => (profile ? resolveTargets(profile) : null), [profile]);

  const suggestedMeals: AIMeal[] | null = generateMeals.data?.suggestedMeals ?? null;
  const currentMealsFromAI: AIMeal[] = generateMeals.data?.currentMeals ?? [];

  const currentMealsForModal: AIMeal[] =
    currentMealsFromAI.length > 0
      ? currentMealsFromAI
      : (mealList ?? []).map((m) => ({
          mealTime: m.mealTime,
          mealLabel: m.mealLabel,
          content: m.content,
          calories: m.calories ?? null,
          proteinG: m.proteinG ?? null,
          carbsG: m.carbsG ?? null,
          fatG: m.fatG ?? null,
        }));

  const aiError = generateMeals.error
    ? formatAiError(generateMeals.error)
    : null;

  const handleAiGenerate = (userNote?: string) => {
    generateMeals.mutate({ dailyPlanId, userNote });
  };

  const handleAiApply = () => {
    if (!suggestedMeals) return;
    applyMeals.mutate(
      { dailyPlanId, newMeals: suggestedMeals },
      { onSuccess: () => setAiOpen(false) },
    );
  };

  const macros = useMemo(() => computeMealMacros(mealList ?? []), [mealList]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/60 bg-card p-3 flex gap-3"
          >
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!mealList?.length) {
    return (
      <div>
        <EmptyState
          icon={UtensilsCrossed}
          title="Bu güne ait öğün yok"
          description={
            readOnly
              ? "Geçmiş bir gün görüntülüyorsun."
              : "AI ile saniyeler içinde günlük plan oluştur veya manuel ekle."
          }
          action={
            !readOnly && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => setAiOpen(true)}
                disabled={isDailyMealExhausted}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI ile Oluştur
                <AiQuotaBadge feature="daily-meal" />
              </Button>
            )
          }
          secondaryAction={
            !readOnly && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Manuel Ekle
              </Button>
            )
          }
        />
        {addOpen && (
          <MealFormDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            dailyPlanId={dailyPlanId}
            planDate={planDate}
          />
        )}
        {aiOpen && (
          <AiMealModal
            open={aiOpen}
            onOpenChange={(v) => {
              setAiOpen(v);
              if (!v) generateMeals.reset();
            }}
            dailyPlanId={dailyPlanId}
            planType={dailyPlanType ?? "rest"}
            currentMeals={currentMealsForModal}
            suggestedMeals={suggestedMeals}
            loading={generateMeals.isPending}
            applying={applyMeals.isPending}
            error={aiError}
            onGenerate={handleAiGenerate}
            onApply={handleAiApply}
          />
        )}
      </div>
    );
  }

  const {
    calories: totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    completedCount,
    percent,
  } = macros;

  return (
    <div className="space-y-3">
      <DailyMacroSummary
        targets={targets}
        calories={totalCalories}
        protein={Math.round(totalProtein)}
        carbs={Math.round(totalCarbs)}
        fat={Math.round(totalFat)}
      />

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground tabular-nums">
            {completedCount}/{mealList.length} tamamlandı
          </span>
          <div className="flex items-center gap-2">
            {!readOnly && completedCount < mealList.length && (
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
            <span className="text-sm font-medium tabular-nums">{totalCalories} kcal</span>
          </div>
        </div>
        <Progress value={percent} />
      </div>

      {!readOnly && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setAiOpen(true)}
          disabled={isDailyMealExhausted}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI ile Programı Değiştir
          <AiQuotaBadge feature="daily-meal" />
        </Button>
      )}

      {mealList.map((meal) => (
        <MealCard
          key={meal.id}
          {...meal}
          dailyPlanId={dailyPlanId}
          isCompleted={meal.isCompleted ?? false}
          readOnly={readOnly}
          planDate={planDate}
          onToggle={readOnly ? undefined : (id, completed) =>
            toggleMeal.mutate({ id, isCompleted: completed })
          }
        />
      ))}

      {!readOnly ? (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Öğün Ekle
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

      {addOpen && (
        <MealFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          dailyPlanId={dailyPlanId}
          planDate={planDate}
        />
      )}

      {bulkDeleteOpen && (
        <BulkDeleteMealsDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          dailyPlanId={dailyPlanId}
          mealCount={mealList.length}
        />
      )}

      {bulkCompleteOpen && (
        <BulkCompleteDialog
          open={bulkCompleteOpen}
          onOpenChange={setBulkCompleteOpen}
          onConfirm={() => bulkComplete.mutate(dailyPlanId)}
          isPending={bulkComplete.isPending}
          itemCount={mealList.length - completedCount}
          itemLabel="öğün"
        />
      )}

      {aiOpen && (
        <AiMealModal
          open={aiOpen}
          onOpenChange={(v) => {
            setAiOpen(v);
            if (!v) generateMeals.reset();
          }}
          dailyPlanId={dailyPlanId}
          planType={dailyPlanType ?? "rest"}
          currentMeals={currentMealsForModal}
          suggestedMeals={suggestedMeals}
          loading={generateMeals.isPending}
          applying={applyMeals.isPending}
          error={aiError}
          onGenerate={handleAiGenerate}
          onApply={handleAiApply}
        />
      )}

      {moveOpen && (
        <MoveDayContentsDialog
          open={moveOpen}
          onOpenChange={setMoveOpen}
          sourceDailyPlanId={dailyPlanId}
          defaultIncludeWorkout={false}
          defaultIncludeMeals={true}
        />
      )}
    </div>
  );
}
