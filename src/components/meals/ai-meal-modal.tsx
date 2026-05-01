"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  RefreshCw,
  Check,
  AlertCircle,
  MessageSquare,
  BookOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { useState } from "react";
import type { AIMeal } from "@/actions/ai-meals";
import {
  useSavedDailyMealSuggestions,
  useSaveDailyMealSuggestion,
  useDeleteDailyMealSuggestion,
  useApplyDailyMeals,
} from "@/hooks/use-meal-ai";

type Tab = "suggest" | "saved";

interface AiMealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyPlanId: number;
  planType: string;
  currentMeals: AIMeal[];
  suggestedMeals: AIMeal[] | null;
  loading: boolean;
  applying: boolean;
  error: string | null;
  onGenerate: (userNote?: string) => void;
  onApply: () => void;
}

function MealRow({ meal }: { meal: AIMeal }) {
  const cal = meal.calories ?? 0;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground">{meal.mealTime}</span>
          <span className="text-xs font-medium truncate">{meal.mealLabel}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{meal.content}</p>
      </div>
      {cal > 0 && (
        <Badge variant="secondary" className="text-[10px] shrink-0">{cal} kcal</Badge>
      )}
    </div>
  );
}

function MealBlock({
  meals,
  label,
  variant = "default",
}: {
  meals: AIMeal[];
  label: string;
  variant?: "default" | "suggested";
}) {
  const totalCal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  return (
    <div
      className={`p-3 rounded-lg ${
        variant === "suggested"
          ? "bg-primary/10 border border-primary/20"
          : "bg-muted"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          className={`text-xs font-medium ${
            variant === "suggested" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {label}
        </p>
        {totalCal > 0 && (
          <span className="text-[10px] text-muted-foreground">{totalCal} kcal</span>
        )}
      </div>
      {meals.length > 0 ? (
        <div className="divide-y divide-border">
          {meals.map((m, i) => (
            <MealRow key={i} meal={m} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Öğün yok</p>
      )}
    </div>
  );
}

function SavedSuggestionRow({
  id,
  meals,
  userNote,
  createdAt,
  dailyPlanId,
  onApplied,
}: {
  id: number;
  meals: AIMeal[];
  userNote: string | null;
  createdAt: Date | string | null;
  dailyPlanId: number;
  onApplied: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const deleteMutation = useDeleteDailyMealSuggestion();
  const applyMutation = useApplyDailyMeals();

  const totalCal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const dateStr = createdAt
    ? new Date(createdAt).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      })
    : "";

  const handleApply = async () => {
    await applyMutation.mutateAsync({ dailyPlanId, newMeals: meals });
    onApplied();
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium">{dateStr}</span>
            <Badge variant="secondary" className="text-[10px]">
              {meals.length} öğün
            </Badge>
            {totalCal > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {totalCal} kcal
              </Badge>
            )}
          </div>
          {userNote && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {userNote}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border">
          <div className="divide-y divide-border pt-1">
            {meals.map((m, i) => (
              <MealRow key={i} meal={m} />
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleApply}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Check className="h-3 w-3 mr-1" />
              )}
              Uygula
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AiMealModal({
  open,
  onOpenChange,
  dailyPlanId,
  planType,
  currentMeals,
  suggestedMeals,
  loading,
  applying,
  error,
  onGenerate,
  onApply,
}: AiMealModalProps) {
  const [tab, setTab] = useState<Tab>("suggest");
  const [ingredients, setIngredients] = useState("");
  const [userNote, setUserNote] = useState("");

  const saved = useSavedDailyMealSuggestions(planType);
  const saveMutation = useSaveDailyMealSuggestion();

  const handleGenerate = () => {
    const parts: string[] = [];
    if (ingredients.trim()) {
      parts.push(`Evde bulunan malzemeler: ${ingredients.trim()}`);
    }
    if (userNote.trim()) {
      parts.push(userNote.trim());
    }
    onGenerate(parts.join(". ") || undefined);
  };

  const handleSave = async () => {
    if (!suggestedMeals) return;
    const noteParts = [
      ingredients.trim() ? `Malzemeler: ${ingredients.trim()}` : "",
      userNote.trim(),
    ].filter(Boolean);
    await saveMutation.mutateAsync({
      planType,
      meals: suggestedMeals,
      userNote: noteParts.join(". ") || undefined,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <SheetHeader sticky>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI ile Beslenme Programı
          </SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setTab("suggest")}
            className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-colors ${
              tab === "suggest"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Öneri Al
            </span>
          </button>
          <button
            onClick={() => setTab("saved")}
            className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-colors ${
              tab === "saved"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5">
              <BookOpen className="h-3 w-3" />
              Kayıtlı
              {saved.data && saved.data.length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">
                  {saved.data.length}
                </Badge>
              )}
            </span>
          </button>
        </div>

        {/* ── Tab: Öneri Al ── */}
        {tab === "suggest" && (
          <div className="space-y-4">
            {/* Current meals */}
            <MealBlock meals={currentMeals} label="Mevcut Öğünler" />

            {/* Error */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Input phase */}
            {!loading && !suggestedMeals && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Evdeki malzemeler (opsiyonel):
                  </p>
                  <textarea
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    rows={2}
                    placeholder="Örn: yumurta, yulaf, tavuk, brokoli, makarna..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
                <div>
                  <div className="flex items-start gap-2 mb-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">Özel istek (opsiyonel):</p>
                  </div>
                  <textarea
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    rows={2}
                    placeholder="Örn: Daha az karbonhidrat, öğle öğününü atla..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
                <Button onClick={handleGenerate} disabled={loading} className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Öneri Al
                </Button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <p className="text-xs text-primary font-medium">
                  AI öneri oluşturuyor...
                </p>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}

            {/* Suggested meals */}
            {!loading && suggestedMeals && (
              <MealBlock
                meals={suggestedMeals}
                label="Önerilen Öğünler"
                variant="suggested"
              />
            )}

            {/* Action buttons */}
            {!loading && suggestedMeals && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={loading || applying || saveMutation.isPending}
                    className="flex-1"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Yeni Öneri
                  </Button>
                  <Button
                    onClick={onApply}
                    disabled={loading || applying || saveMutation.isPending}
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={handleSave}
                  disabled={saveMutation.isPending || applying}
                >
                  {saveMutation.isPending ? (
                    <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <BookOpen className="h-3 w-3 mr-1" />
                  )}
                  Kayıtlara Ekle
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Kayıtlı Öneriler ── */}
        {tab === "saved" && (
          <div className="space-y-2">
            {saved.isLoading && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            )}
            {!saved.isLoading && (!saved.data || saved.data.length === 0) && (
              <p className="text-center text-sm text-muted-foreground py-6">
                Kayıtlı öneri bulunamadı
              </p>
            )}
            {saved.data?.map((s) => (
              <SavedSuggestionRow
                key={s.id}
                id={s.id}
                meals={s.meals}
                userNote={s.userNote}
                createdAt={s.createdAt}
                dailyPlanId={dailyPlanId}
                onApplied={() => onOpenChange(false)}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
