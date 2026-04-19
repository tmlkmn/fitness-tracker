"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed } from "lucide-react";
import { useRecentMealsByLabel } from "@/hooks/use-meal-history";

interface MealCopyPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealLabel: string;
  dailyPlanId: number;
  onSelect: (meal: {
    content: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  }) => void;
}

export function MealCopyPicker({
  open,
  onOpenChange,
  mealLabel,
  dailyPlanId,
  onSelect,
}: MealCopyPickerProps) {
  const { data: meals, isLoading } = useRecentMealsByLabel(
    mealLabel,
    dailyPlanId,
    open,
  );

  // Group by date
  const grouped = useMemo(() => {
    if (!meals) return [];
    const map = new Map<string, typeof meals>();
    for (const meal of meals) {
      const date = meal.date ?? "unknown";
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(meal);
    }
    return Array.from(map.entries());
  }, [meals]);

  const handleSelect = (meal: (typeof meals extends (infer T)[] | undefined ? T : never)) => {
    onSelect({
      content: meal.content,
      calories: meal.calories?.toString() ?? "",
      protein: meal.proteinG ?? "",
      carbs: meal.carbsG ?? "",
      fat: meal.fatG ?? "",
    });
    onOpenChange(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      weekday: "short",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Önceki Günlerden Kopyala</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Yükleniyor...</p>
          ) : grouped.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <UtensilsCrossed className="h-8 w-8 mx-auto text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">
                Önceki günlerde &ldquo;{mealLabel}&rdquo; bulunamadı
              </p>
            </div>
          ) : (
            grouped.map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                  {formatDate(date)}
                </p>
                <div className="space-y-1.5">
                  {items.map((item, i) => (
                    <button
                      key={`${date}-${i}`}
                      className="w-full text-left rounded-lg border p-2.5 hover:bg-muted/50 transition-colors space-y-1"
                      onClick={() => handleSelect(item)}
                    >
                      <p className="text-sm line-clamp-2">{item.content}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {item.calories && <span>{item.calories} kcal</span>}
                        {item.proteinG && <Badge variant="outline" className="text-[10px] h-4 px-1">P: {item.proteinG}g</Badge>}
                        {item.carbsG && <Badge variant="outline" className="text-[10px] h-4 px-1">K: {item.carbsG}g</Badge>}
                        {item.fatG && <Badge variant="outline" className="text-[10px] h-4 px-1">Y: {item.fatG}g</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
