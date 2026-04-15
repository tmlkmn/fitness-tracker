"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, Check, AlertCircle } from "lucide-react";
import type { AIMeal } from "@/actions/ai-meals";

interface AiMealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedMeals: AIMeal[] | null;
  loading: boolean;
  applying: boolean;
  error: string | null;
  onGenerate: () => void;
  onApply: () => void;
}

function MealRow({ meal }: { meal: AIMeal }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
        {meal.mealTime}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium">{meal.mealLabel}</p>
          {meal.calories && (
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {meal.calories} kcal
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground break-words">{meal.content}</p>
      </div>
    </div>
  );
}

export function AiMealModal({
  open,
  onOpenChange,
  suggestedMeals,
  loading,
  applying,
  error,
  onGenerate,
  onApply,
}: AiMealModalProps) {
  const totalCalories = suggestedMeals?.reduce(
    (sum, m) => sum + (m.calories ?? 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI ile Öğün Oluştur
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {loading && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <p className="text-xs text-primary mb-2 font-medium">
                AI öğün planı oluşturuyor...
              </p>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          )}

          {!loading && suggestedMeals && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-primary font-medium">
                  Önerilen Öğün Planı
                </p>
                {totalCalories ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Toplam: {totalCalories} kcal
                  </Badge>
                ) : null}
              </div>
              <div className="divide-y divide-border">
                {suggestedMeals.map((meal, i) => (
                  <MealRow key={i} meal={meal} />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onGenerate}
              disabled={loading || applying}
              className="flex-1"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {suggestedMeals ? "Yeni Öneri" : "Öneri Al"}
            </Button>
            {suggestedMeals && (
              <Button
                onClick={onApply}
                disabled={loading || applying}
                className="flex-1"
              >
                {applying ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Onayla
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
