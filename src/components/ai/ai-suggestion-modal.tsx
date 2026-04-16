"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, AlertCircle, Check } from "lucide-react";
import { generateMealVariation } from "@/actions/ai";
import type { MealVariationSuggestion } from "@/actions/ai";
import { useUpdateMeal } from "@/hooks/use-meal-crud";

interface AiSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealId: number;
  mealTime: string;
  mealLabel: string;
  currentContent: string;
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
}

export function AiSuggestionModal({
  open,
  onOpenChange,
  mealId,
  mealTime,
  mealLabel,
  currentContent,
  calories,
  proteinG,
  carbsG,
  fatG,
}: AiSuggestionModalProps) {
  const [suggestion, setSuggestion] = useState<MealVariationSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const updateMeal = useUpdateMeal();

  const generateSuggestion = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await generateMealVariation(
        mealLabel,
        currentContent,
        calories,
        proteinG,
        carbsG,
        fatG,
        mealId
      );
      setSuggestion(result.suggestion);
    } catch (err) {
      const message =
        err instanceof Error && err.message === "RATE_LIMITED"
          ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
          : "AI özelliği şu anda kullanılamıyor. Daha sonra tekrar deneyin.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!suggestion) return;
    updateMeal.mutate(
      {
        mealId,
        data: {
          mealTime,
          mealLabel,
          content: suggestion.content,
          calories: suggestion.calories,
          proteinG: suggestion.proteinG,
          carbsG: suggestion.carbsG,
          fatG: suggestion.fatG,
        },
      },
      {
        onSuccess: () => {
          setSuggestion(null);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Öğün Önerisi
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">
              Mevcut öğün:
            </p>
            <p className="text-sm font-medium">{mealLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentContent}
            </p>
            {calories && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px]">{calories} kcal</Badge>
                {proteinG && <Badge variant="outline" className="text-[10px]">P: {proteinG}g</Badge>}
                {carbsG && <Badge variant="outline" className="text-[10px]">K: {carbsG}g</Badge>}
                {fatG && <Badge variant="outline" className="text-[10px]">Y: {fatG}g</Badge>}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {suggestion && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-xs text-primary mb-1 font-medium">Öneri:</p>
              <p className="text-sm">{suggestion.content}</p>
              {suggestion.calories && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{suggestion.calories} kcal</Badge>
                  {suggestion.proteinG && <Badge variant="outline" className="text-[10px]">P: {suggestion.proteinG}g</Badge>}
                  {suggestion.carbsG && <Badge variant="outline" className="text-[10px]">K: {suggestion.carbsG}g</Badge>}
                  {suggestion.fatG && <Badge variant="outline" className="text-[10px]">Y: {suggestion.fatG}g</Badge>}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={generateSuggestion}
              disabled={loading || updateMeal.isPending}
              variant={suggestion ? "outline" : "default"}
              className="flex-1"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {suggestion ? "Yeni Öneri" : "Öneri Al"}
            </Button>
            {suggestion && (
              <Button
                onClick={handleApply}
                disabled={updateMeal.isPending}
                className="flex-1"
              >
                {updateMeal.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Uygula
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
