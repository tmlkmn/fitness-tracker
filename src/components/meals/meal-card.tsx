"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MealCardProps {
  id: number;
  mealTime: string;
  mealLabel: string;
  content: string;
  calories?: number | null;
  isCompleted: boolean;
  onToggle: (id: number, isCompleted: boolean) => void;
}

export function MealCard({
  id,
  mealTime,
  mealLabel,
  content,
  calories,
  isCompleted,
  onToggle,
}: MealCardProps) {
  return (
    <Card className={cn("transition-opacity", isCompleted && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={(checked) => onToggle(id, !!checked)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {mealTime}
                </span>
                <span className="text-sm font-semibold">{mealLabel}</span>
              </div>
              {calories ? (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {calories} kcal
                </Badge>
              ) : null}
            </div>
            <p
              className={cn(
                "text-sm text-muted-foreground mt-1",
                isCompleted && "line-through"
              )}
            >
              {content}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
