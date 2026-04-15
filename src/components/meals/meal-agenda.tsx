"use client";

import { useMeals, useToggleMeal } from "@/hooks/use-meals";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { stripEmoji, getMealIcon, DynamicIcon } from "@/lib/icon-map";

interface MealAgendaProps {
  dailyPlanId: number;
}

export function MealAgenda({ dailyPlanId }: MealAgendaProps) {
  const { data: meals, isLoading } = useMeals(dailyPlanId);
  const toggleMeal = useToggleMeal();

  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-14 shrink-0" />
            <Skeleton className="h-12 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!meals?.length) {
    return (
      <p className="text-center text-muted-foreground py-8 text-sm">
        Öğün bulunamadı
      </p>
    );
  }

  return (
    <div className="relative py-1">
      {meals.map((meal, index) => {
        const isLast = index === meals.length - 1;
        const isCompleted = meal.isCompleted ?? false;
        const mealIcon = getMealIcon(meal.mealLabel);

        return (
          <div key={meal.id} className="flex gap-3">
            {/* Time column + vertical line */}
            <div className="flex flex-col items-center w-14 shrink-0">
              <span
                className={cn(
                  "text-xs font-mono",
                  isCompleted
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground"
                )}
              >
                {meal.mealTime}
              </span>
              {!isLast && (
                <div className="flex-1 w-px bg-border my-1 min-h-[1.5rem]" />
              )}
            </div>

            {/* Content */}
            <div
              className={cn(
                "flex-1 pb-4 transition-opacity",
                isCompleted && "opacity-50"
              )}
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isCompleted}
                  onCheckedChange={(checked) =>
                    toggleMeal.mutate({
                      id: meal.id,
                      isCompleted: !!checked,
                    })
                  }
                  className="h-4 w-4"
                />
                <DynamicIcon icon={mealIcon} className="h-3.5 w-3.5 text-primary shrink-0" />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCompleted && "line-through"
                  )}
                >
                  {stripEmoji(meal.mealLabel)}
                </span>
                {meal.calories ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 ml-auto shrink-0"
                  >
                    {meal.calories} kcal
                  </Badge>
                ) : null}
              </div>
              <p
                className={cn(
                  "text-xs text-muted-foreground mt-1 pl-6",
                  isCompleted && "line-through"
                )}
              >
                {meal.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
