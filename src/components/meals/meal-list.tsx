"use client";

import { useMeals, useToggleMeal } from "@/hooks/use-meals";
import { MealCard } from "./meal-card";
import { Skeleton } from "@/components/ui/skeleton";

interface MealListProps {
  dailyPlanId: number;
}

export function MealList({ dailyPlanId }: MealListProps) {
  const { data: mealList, isLoading } = useMeals(dailyPlanId);
  const toggleMeal = useToggleMeal();

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
      <p className="text-center text-muted-foreground py-8">
        Öğün bulunamadı
      </p>
    );
  }

  const totalCalories = mealList.reduce((sum, m) => sum + (m.calories || 0), 0);
  const completedCount = mealList.filter((m) => m.isCompleted).length;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {completedCount}/{mealList.length} tamamlandı
        </span>
        <span className="text-sm font-medium">Toplam: {totalCalories} kcal</span>
      </div>
      {mealList.map((meal) => (
        <MealCard
          key={meal.id}
          {...meal}
          isCompleted={meal.isCompleted ?? false}
          onToggle={(id, completed) =>
            toggleMeal.mutate({ id, isCompleted: completed })
          }
        />
      ))}
    </div>
  );
}
