"use client";

import { useState } from "react";
import { useMeals, useToggleMeal } from "@/hooks/use-meals";
import { MealCard } from "./meal-card";
import { MealFormDialog } from "./meal-form-dialog";
import { DailyMacroSummary } from "./daily-macro-summary";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Sparkles, UtensilsCrossed, Trash2, CheckCheck } from "lucide-react";
import { BulkDeleteMealsDialog } from "./bulk-delete-meals-dialog";
import { useBulkCompleteMeals } from "@/hooks/use-bulk-completion";
import { useReorderMeals } from "@/hooks/use-reorder";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface MealListProps {
  dailyPlanId: number;
  readOnly?: boolean;
  planDate?: string;
  onAiGenerate?: () => void;
}

export function MealList({ dailyPlanId, readOnly, planDate, onAiGenerate }: MealListProps) {
  const { data: mealList, isLoading } = useMeals(dailyPlanId);
  const toggleMeal = useToggleMeal();
  const [addOpen, setAddOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const bulkComplete = useBulkCompleteMeals();
  const reorder = useReorderMeals();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !mealList) return;
    const oldIndex = mealList.findIndex((m) => m.id === active.id);
    const newIndex = mealList.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = [...mealList];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    reorder.mutate({
      dailyPlanId,
      orderedIds: newOrder.map((m) => m.id),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!mealList?.length) {
    return (
      <div className="text-center py-8 space-y-3">
        <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
        <p className="text-sm text-muted-foreground">Öğün bulunamadı</p>
        {!readOnly && (
          <div className="flex gap-2 justify-center">
            {onAiGenerate && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onAiGenerate}>
                <Sparkles className="h-3.5 w-3.5" />
                AI ile Oluştur
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Manuel Ekle
            </Button>
          </div>
        )}
        {addOpen && (
          <MealFormDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            dailyPlanId={dailyPlanId}
            planDate={planDate}
          />
        )}
      </div>
    );
  }

  const totalCalories = mealList.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = mealList.reduce(
    (sum, m) => sum + parseFloat(m.proteinG ?? "0"),
    0
  );
  const totalCarbs = mealList.reduce(
    (sum, m) => sum + parseFloat(m.carbsG ?? "0"),
    0
  );
  const totalFat = mealList.reduce(
    (sum, m) => sum + parseFloat(m.fatG ?? "0"),
    0
  );
  const completedCount = mealList.filter((m) => m.isCompleted).length;
  const percent = Math.round((completedCount / mealList.length) * 100);

  return (
    <div className="space-y-3">
      <DailyMacroSummary
        calories={totalCalories}
        protein={Math.round(totalProtein)}
        carbs={Math.round(totalCarbs)}
        fat={Math.round(totalFat)}
      />

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            {completedCount}/{mealList.length} tamamlandı
          </span>
          <div className="flex items-center gap-2">
            {!readOnly && completedCount < mealList.length && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={() => bulkComplete.mutate(dailyPlanId)}
                disabled={bulkComplete.isPending}
              >
                <CheckCheck className="h-3 w-3" />
                Tümünü Tamamla
              </Button>
            )}
            <span className="text-sm font-medium">{totalCalories} kcal</span>
          </div>
        </div>
        <Progress value={percent} />
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={mealList.map((m) => m.id)} strategy={verticalListSortingStrategy}>
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
        </SortableContext>
      </DndContext>

      {!readOnly && (
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
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Tümünü Sil
          </Button>
        </div>
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
    </div>
  );
}
