"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { stripEmoji, getMealIcon, DynamicIcon } from "@/lib/icon-map";
import { AiSuggestionModal } from "@/components/ai/ai-suggestion-modal";
import { MealFormDialog } from "./meal-form-dialog";
import { MealDeleteDialog } from "./meal-delete-dialog";
import { Pencil, Trash2, Sparkles } from "lucide-react";
import { SwipeableCard } from "@/components/ui/swipeable-card";

interface MealCardProps {
  id: number;
  dailyPlanId: number | null;
  mealTime: string;
  mealLabel: string;
  content: string;
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
  isCompleted: boolean;
  onToggle?: (id: number, isCompleted: boolean) => void;
  readOnly?: boolean;
  planDate?: string;
}

export function MealCard({
  id,
  dailyPlanId,
  mealTime,
  mealLabel,
  content,
  calories,
  proteinG,
  carbsG,
  fatG,
  isCompleted,
  onToggle,
  readOnly,
  planDate,
}: MealCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const mealIcon = getMealIcon(mealLabel);

  const isMealTimePast = (() => {
    if (!planDate) return false;
    const todayStr = new Date().toISOString().split("T")[0];
    if (planDate !== todayStr) return false;
    const now = new Date();
    const [h, m] = mealTime.split(":").map(Number);
    return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
  })();

  const cardElement = (
      <Card
        className={cn(
          "transition-all duration-200",
          isCompleted && "opacity-60"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {!readOnly && (
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => onToggle?.(id, !!checked)}
                className="mt-1 h-5 w-5"
              />
            )}
            <div className="mt-0.5 shrink-0">
              <DynamicIcon icon={mealIcon} className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs text-muted-foreground font-mono",
                    readOnly && isCompleted && "line-through"
                  )}>
                    {mealTime}
                  </span>
                  <span className={cn(
                    "text-sm font-semibold",
                    readOnly && isCompleted && "line-through opacity-60"
                  )}>
                    {stripEmoji(mealLabel)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {calories ? (
                    <Badge variant="secondary" className="text-xs">
                      {calories} kcal
                    </Badge>
                  ) : null}
                  {!readOnly && !isCompleted && (
                    <>
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
                      {!isMealTimePast && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setAiOpen(true)}
                        >
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <p
                className={cn(
                  "text-sm text-muted-foreground mt-1 transition-all duration-200",
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
        <MealFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          dailyPlanId={dailyPlanId}
          meal={{
            id,
            mealTime,
            mealLabel,
            content,
            calories,
            proteinG,
            carbsG,
            fatG,
          }}
        />
      )}

      {deleteOpen && (
        <MealDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          mealId={id}
          mealLabel={mealLabel}
        />
      )}

      {aiOpen && (
        <AiSuggestionModal
          open={aiOpen}
          onOpenChange={setAiOpen}
          mealId={id}
          mealTime={mealTime}
          mealLabel={mealLabel}
          currentContent={content}
          calories={calories}
          proteinG={proteinG}
          carbsG={carbsG}
          fatG={fatG}
        />
      )}
    </>
  );
}
