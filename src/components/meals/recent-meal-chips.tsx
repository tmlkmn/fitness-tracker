"use client";

import { Badge } from "@/components/ui/badge";
import { useFrequentMeals } from "@/hooks/use-meal-history";

interface RecentMealChipsProps {
  onSelect: (meal: {
    mealLabel: string;
    content: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  }) => void;
}

export function RecentMealChips({ onSelect }: RecentMealChipsProps) {
  const { data: meals } = useFrequentMeals();

  if (!meals || meals.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground">Son kullanılanlar</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {meals.map((meal, i) => (
          <Badge
            key={i}
            variant="outline"
            className="cursor-pointer hover:bg-muted shrink-0 text-xs max-w-[160px] truncate"
            onClick={() =>
              onSelect({
                mealLabel: meal.mealLabel,
                content: meal.content,
                calories: meal.avgCalories?.toString() ?? "",
                protein: meal.avgProtein ?? "",
                carbs: meal.avgCarbs ?? "",
                fat: meal.avgFat ?? "",
              })
            }
          >
            {meal.content.length > 25
              ? meal.content.slice(0, 25) + "..."
              : meal.content}
          </Badge>
        ))}
      </div>
    </div>
  );
}
