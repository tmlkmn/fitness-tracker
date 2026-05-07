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
import { MealSwapModal } from "./meal-swap-modal";
import { Pencil, Trash2, Sparkles, Star, ArrowLeftRight } from "lucide-react";
import { SwipeableCard } from "@/components/ui/swipeable-card";
import { useSaveMealSuggestion } from "@/hooks/use-saved-meals";

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
  icon?: string | null;
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
  icon,
  isCompleted,
  onToggle,
  readOnly,
  planDate,
}: MealCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [favSaved, setFavSaved] = useState(false);
  const saveMutation = useSaveMealSuggestion();

  const handleFavorite = () => {
    setFavSaved(true);
    saveMutation.mutate(
      { mealLabel, content, calories: calories ?? null, proteinG: proteinG ?? null, carbsG: carbsG ?? null, fatG: fatG ?? null },
      { onError: () => setFavSaved(false) },
    );
  };

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
          "transition-all duration-200 shadow border-border/80 bg-muted",
          isCompleted && "opacity-60"
        )}
      >
        <CardContent className="p-4 pb-2">
          <div className="flex items-start gap-3">
            {!readOnly && (
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => onToggle?.(id, !!checked)}
                className="mt-1 h-5 w-5"
              />
            )}
            <div className="mt-0.5 shrink-0">
              {icon ? (
                <span className="text-base leading-none">{icon}</span>
              ) : (
                <DynamicIcon icon={mealIcon} className="h-4 w-4 text-primary" />
              )}
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
                    </>
                  )}
                </div>
              </div>
              {calories ? (
                <Badge variant="secondary" className="text-xs tabular-nums mt-0.5">
                  {calories} kcal
                </Badge>
              ) : null}
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

        {!readOnly && !isCompleted && (
          <div className="border-t border-border/40 flex items-stretch px-1 pb-1">
            <Button
              variant="ghost"
              className="flex flex-col h-11 px-3 gap-0.5 text-muted-foreground"
              onClick={handleFavorite}
              disabled={saveMutation.isPending}
            >
              <Star className={cn("h-5 w-5", favSaved && "fill-current text-yellow-400")} />
              <span className="text-[10px] leading-none font-medium">
                {favSaved ? "Kaydedildi" : "Favori"}
              </span>
            </Button>
            <Button
              variant="ghost"
              className="flex flex-col h-11 px-3 gap-0.5 text-muted-foreground"
              onClick={() => setSwapOpen(true)}
            >
              <ArrowLeftRight className="h-5 w-5" />
              <span className="text-[10px] leading-none font-medium">Değiştir</span>
            </Button>
            {!isMealTimePast && (
              <Button
                variant="ghost"
                className="flex flex-col h-11 px-3 gap-0.5 text-primary ml-auto"
                onClick={() => setAiOpen(true)}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-[10px] leading-none font-medium">AI</span>
              </Button>
            )}
          </div>
        )}
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
            icon,
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

      {swapOpen && dailyPlanId && (
        <MealSwapModal
          open={swapOpen}
          onOpenChange={setSwapOpen}
          mealId={id}
          mealTime={mealTime}
          mealLabel={mealLabel}
          dailyPlanId={dailyPlanId}
        />
      )}
    </>
  );
}
