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
import { Sparkles, RefreshCw, Check, AlertCircle, MessageSquare } from "lucide-react";
import type { AIMeal } from "@/actions/ai-meals";
import { useState } from "react";

const INGREDIENT_TAGS = [
  "Tavuk", "Kırmızı et", "Balık", "Yumurta", "Ton balığı",
  "Pirinç", "Makarna", "Ekmek", "Yulaf", "Bulgur", "Kinoa",
  "Brokoli", "Ispanak", "Domates", "Salatalık", "Biber",
  "Süt", "Yoğurt", "Peynir", "Lor",
  "Kuruyemiş", "Zeytin", "Zeytinyağı", "Bal", "Avokado",
];

interface AiMealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedMeals: AIMeal[] | null;
  loading: boolean;
  applying: boolean;
  error: string | null;
  onGenerate: (userNote?: string) => void;
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
  const [userNote, setUserNote] = useState("");
  const [ingredientMode, setIngredientMode] = useState<"all" | "specific">("all");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  const toggleIngredient = (ing: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing],
    );
  };

  const totalCalories = suggestedMeals?.reduce(
    (sum, m) => sum + (m.calories ?? 0),
    0,
  );

  const handleGenerate = () => {
    const parts: string[] = [];
    if (ingredientMode === "specific" && selectedIngredients.length > 0) {
      parts.push(`Evde mevcut malzemeler: ${selectedIngredients.join(", ")}. Sadece bu malzemelerle yapılabilecek yemekler öner`);
    }
    const note = userNote.trim();
    if (note) parts.push(note);
    onGenerate(parts.length > 0 ? parts.join(". ") : undefined);
  };

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

          {/* Phase 1: User input */}
          {!loading && !suggestedMeals && (
            <div className="space-y-3">
              {/* Ingredient selection */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Evdeki malzemeler:
                </p>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setIngredientMode("all")}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      ingredientMode === "all"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Her şey var
                  </button>
                  <button
                    onClick={() => setIngredientMode("specific")}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      ingredientMode === "specific"
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Malzeme belirt
                  </button>
                </div>
                {ingredientMode === "specific" && (
                  <div className="flex flex-wrap gap-1.5">
                    {INGREDIENT_TAGS.map((ing) => {
                      const isSelected = selectedIngredients.includes(ing);
                      return (
                        <button
                          key={ing}
                          onClick={() => toggleIngredient(ing)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                            isSelected
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {ing}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Beslenme planı için özel bir isteğin var mı?
                </p>
              </div>
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={2}
                placeholder="Örn: Bugün düşük karbonhidrat istiyorum, süt ürünleri olmasın, daha fazla protein..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Öneri Al
              </Button>
            </div>
          )}

          {/* Loading */}
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

          {/* Phase 2: Results */}
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

          {/* Phase 2 buttons */}
          {!loading && suggestedMeals && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={loading || applying}
                className="flex-1"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Yeni Öneri
              </Button>
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
