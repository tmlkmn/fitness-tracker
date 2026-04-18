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
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Check,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { generateMealVariation } from "@/actions/ai";
import type { MealVariationSuggestion } from "@/actions/ai";
import { useUpdateMeal } from "@/hooks/use-meal-crud";
import {
  useSavedMealSuggestions,
  useSaveMealSuggestion,
  useDeleteSavedMealSuggestion,
} from "@/hooks/use-saved-meals";

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

type ModalView = "input" | "suggestions" | "saved";

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
  const [suggestions, setSuggestions] = useState<MealVariationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userNote, setUserNote] = useState("");
  const [ingredientMode, setIngredientMode] = useState<"all" | "specific">("all");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [view, setView] = useState<ModalView>("input");
  const previousSuggestionsRef = useRef<string[]>([]);
  const updateMeal = useUpdateMeal();
  const saveMeal = useSaveMealSuggestion();
  const deleteSaved = useDeleteSavedMealSuggestion();
  const { data: savedMeals, isLoading: savedLoading } = useSavedMealSuggestions();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedFilter, setSavedFilter] = useState<string | null>(null);

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
      setSuggestions(result.suggestions);
      setView("suggestions");
      // Track suggestions for future calls
      for (const s of result.suggestions) {
        if (s.content) {
          previousSuggestionsRef.current.push(s.content);
        }
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

  const handleApply = (suggestion: MealVariationSuggestion) => {
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
          setSuggestions([]);
          previousSuggestionsRef.current = [];
          setView("input");
          onOpenChange(false);
        },
      }
    );
  };

  const handleSave = (suggestion: MealVariationSuggestion) => {
    const key = suggestion.content;
    if (savedIds.has(key)) return;
    saveMeal.mutate({
      mealLabel,
      content: suggestion.content,
      calories: suggestion.calories ?? null,
      proteinG: suggestion.proteinG ?? null,
      carbsG: suggestion.carbsG ?? null,
      fatG: suggestion.fatG ?? null,
    });
    setSavedIds((prev) => new Set(prev).add(key));
  };

  const handleDeleteSaved = (id: number) => {
    deleteSaved.mutate(id);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      previousSuggestionsRef.current = [];
      setSuggestions([]);
      setView("input");
      setError("");
      setSavedIds(new Set());
      setSavedFilter(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view !== "input" && (
              <button
                onClick={() => setView(view === "saved" ? "input" : "input")}
                className="h-6 w-6 rounded hover:bg-accent flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Sparkles className="h-4 w-4 text-primary" />
            {view === "saved" ? "Kayıtlı Öğünler" : "AI Öğün Önerisi"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Current meal info — always visible */}
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

          {/* ── INPUT VIEW ── */}
          {view === "input" && !loading && (
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

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={generateSuggestion}
                  disabled={loading}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Öneri Al
                </Button>
                {savedMeals && savedMeals.length > 0 && (
                  <Button
                    onClick={() => setView("saved")}
                    variant="outline"
                    className="flex-1"
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    Kayıtlı ({savedMeals.length})
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">3 farklı öneri hazırlanıyor...</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* ── SUGGESTIONS VIEW ── */}
          {view === "suggestions" && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2"
                >
                  <p className="text-xs text-primary font-medium">Öneri {i + 1}</p>
                  <p className="text-sm leading-relaxed">{s.content}</p>
                  {s.calories && (
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">{s.calories} kcal</Badge>
                      {s.proteinG && <Badge variant="outline" className="text-[10px]">P: {s.proteinG}g</Badge>}
                      {s.carbsG && <Badge variant="outline" className="text-[10px]">K: {s.carbsG}g</Badge>}
                      {s.fatG && <Badge variant="outline" className="text-[10px]">Y: {s.fatG}g</Badge>}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleApply(s)}
                      disabled={updateMeal.isPending}
                      className="flex-1 h-8"
                    >
                      {updateMeal.isPending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Uygula
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(s)}
                      disabled={saveMeal.isPending || savedIds.has(s.content)}
                      className="h-8"
                    >
                      {savedIds.has(s.content) ? (
                        <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Bookmark className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                onClick={generateSuggestion}
                disabled={loading || updateMeal.isPending}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Yeni Öneriler
              </Button>
            </div>
          )}

          {/* ── SAVED VIEW ── */}
          {view === "saved" && (
            <div className="space-y-3">
              {savedLoading && (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!savedLoading && (!savedMeals || savedMeals.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Henüz kayıtlı öğün yok
                </p>
              )}
              {!savedLoading && savedMeals && savedMeals.length > 0 && (() => {
                const labels = Array.from(new Set(savedMeals.map((s) => s.mealLabel)));
                const filtered = savedFilter
                  ? savedMeals.filter((s) => s.mealLabel === savedFilter)
                  : savedMeals;
                return (
                  <>
                    {labels.length > 1 && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setSavedFilter(null)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                            savedFilter === null
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          Tümü ({savedMeals.length})
                        </button>
                        {labels.map((label) => (
                          <button
                            key={label}
                            onClick={() => setSavedFilter(savedFilter === label ? null : label)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                              savedFilter === label
                                ? "bg-primary/15 border-primary/40 text-primary"
                                : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {label} ({savedMeals.filter((s) => s.mealLabel === label).length})
                          </button>
                        ))}
                      </div>
                    )}
                    {filtered.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 bg-muted/50 border border-border rounded-lg space-y-2"
                      >
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{s.mealLabel}</Badge>
                        </div>
                        <p className="text-sm leading-relaxed">{s.content}</p>
                        {s.calories && (
                          <div className="flex gap-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px]">{s.calories} kcal</Badge>
                            {s.proteinG && <Badge variant="outline" className="text-[10px]">P: {s.proteinG}g</Badge>}
                            {s.carbsG && <Badge variant="outline" className="text-[10px]">K: {s.carbsG}g</Badge>}
                            {s.fatG && <Badge variant="outline" className="text-[10px]">Y: {s.fatG}g</Badge>}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => handleApply({
                              content: s.content,
                              calories: s.calories,
                              proteinG: s.proteinG,
                              carbsG: s.carbsG,
                              fatG: s.fatG,
                            })}
                            disabled={updateMeal.isPending}
                            className="flex-1 h-8"
                          >
                            {updateMeal.isPending ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Uygula
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSaved(s.id)}
                            disabled={deleteSaved.isPending}
                            className="h-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
