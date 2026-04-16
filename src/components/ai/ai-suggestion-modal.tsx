"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, AlertCircle, Check, MessageSquare } from "lucide-react";
import { generateMealVariation } from "@/actions/ai";
import type { MealVariationSuggestion } from "@/actions/ai";
import { useUpdateMeal } from "@/hooks/use-meal-crud";

const INGREDIENT_TAGS = [
  "Tavuk", "Kırmızı et", "Balık", "Yumurta", "Ton balığı",
  "Pirinç", "Makarna", "Ekmek", "Yulaf", "Bulgur", "Kinoa",
  "Brokoli", "Ispanak", "Domates", "Salatalık", "Biber",
  "Süt", "Yoğurt", "Peynir", "Lor",
  "Kuruyemiş", "Zeytin", "Zeytinyağı", "Bal", "Avokado",
];

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
  const [userNote, setUserNote] = useState("");
  const [ingredientMode, setIngredientMode] = useState<"all" | "specific">("all");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const previousSuggestionsRef = useRef<string[]>([]);
  const updateMeal = useUpdateMeal();

  const toggleIngredient = (ing: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing],
    );
  };

  const buildUserNote = (): string | undefined => {
    const parts: string[] = [];
    if (ingredientMode === "specific" && selectedIngredients.length > 0) {
      parts.push(`Evde mevcut malzemeler: ${selectedIngredients.join(", ")}. Sadece bu malzemelerle yapılabilecek yemekler öner`);
    }
    const note = userNote.trim();
    if (note) parts.push(note);
    return parts.length > 0 ? parts.join(". ") : undefined;
  };

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
        mealId,
        previousSuggestionsRef.current,
        buildUserNote()
      );
      setSuggestion(result.suggestion);
      // Track this suggestion for future "Yeni Öneri" calls
      if (result.suggestion.content) {
        previousSuggestionsRef.current = [
          ...previousSuggestionsRef.current,
          result.suggestion.content,
        ];
      }
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
          previousSuggestionsRef.current = [];
          onOpenChange(false);
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset state when closing
      previousSuggestionsRef.current = [];
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto overflow-x-hidden">
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

          {/* Ingredient selection + custom note (always visible before first suggestion or when no suggestion) */}
          {!suggestion && !loading && (
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

              {/* Custom note */}
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Özel bir isteğin varsa yaz:
                </p>
              </div>
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                rows={2}
                placeholder="Örn: Daha hafif bir alternatif olsun, süt ürünleri olmasın..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          )}

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
