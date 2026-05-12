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
import { useState, useEffect } from "react";
import type { AIMeal } from "@/actions/ai-meals";
import {
  useSavedDailyMealSuggestions,
  useSaveDailyMealSuggestion,
  useDeleteDailyMealSuggestion,
  useApplyDailyMeals,
} from "@/hooks/use-meal-ai";
import { AiGeneratingOverlay, type GeneratingStep } from "@/components/ai/ai-generating-overlay";
import { MeasurementNudge } from "@/components/ai/measurement-nudge";
import { useTranslations, useLocale } from "next-intl";
import { getLocalizedMealLabel, isMealLabel } from "@/lib/meal-labels";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";
import { buildAiUserNote } from "@/lib/ai-user-note";
import { AiNoteTextarea } from "@/components/ai/ai-note-textarea";

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
  const locale = useLocale() as Locale;
  const cal = meal.calories ?? 0;
  const displayLabel = isMealLabel(meal.mealLabel)
    ? getLocalizedMealLabel(meal.mealLabel, locale)
    : meal.mealLabel;
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground">{meal.mealTime}</span>
          <span className="text-xs font-medium truncate">{displayLabel}</span>
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
  const t = useTranslations("meals.aiModal");
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
        <p className="text-xs text-muted-foreground">{t("noMeals")}</p>
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
  const t = useTranslations("meals.aiModal");
  const locale = useLocale() as Locale;
  const [expanded, setExpanded] = useState(false);
  const deleteMutation = useDeleteDailyMealSuggestion();
  const applyMutation = useApplyDailyMeals();

  const totalCal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const dateStr = createdAt
    ? formatDate(createdAt, locale, { day: "numeric", month: "short" })
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
              {t("mealCount", { count: meals.length })}
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
              {t("apply")}
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
  const t = useTranslations("meals.aiModal");
  const [tab, setTab] = useState<Tab>("suggest");
  const [ingredients, setIngredients] = useState("");
  const [userNote, setUserNote] = useState("");
  const [profileDone, setProfileDone] = useState(false);

  useEffect(() => {
    if (!loading) { setProfileDone(false); return; }
    const tm = setTimeout(() => setProfileDone(true), 1200);
    return () => clearTimeout(tm);
  }, [loading]);

  const mealOverlaySteps: GeneratingStep[] = [
    { label: t("stepProfile"), status: profileDone ? "completed" : loading ? "active" : "pending" },
    { label: t("stepPlan"), status: loading && profileDone ? "active" : "pending" },
  ];

  const saved = useSavedDailyMealSuggestions(planType);
  const saveMutation = useSaveDailyMealSuggestion();

  const handleGenerate = () => {
    onGenerate(
      buildAiUserNote([
        ingredients.trim() ? `${t("ingredientsPrefix")}: ${ingredients.trim()}` : null,
        userNote,
      ]),
    );
  };

  const handleSave = async () => {
    if (!suggestedMeals) return;
    await saveMutation.mutateAsync({
      planType,
      meals: suggestedMeals,
      userNote: buildAiUserNote([
        ingredients.trim() ? `${t("ingredientsNote")}: ${ingredients.trim()}` : null,
        userNote,
      ]),
    });
  };

  return (
    <>
      <AiGeneratingOverlay
        open={loading}
        title={t("overlayTitle")}
        steps={mealOverlaySteps}
      />
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[95svh] h-[95svh] overflow-y-auto overflow-x-hidden">
        <SheetHeader sticky>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("title")}
          </SheetTitle>
        </SheetHeader>

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
              {t("tabSuggest")}
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
              {t("tabSaved")}
              {saved.data && saved.data.length > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">
                  {saved.data.length}
                </Badge>
              )}
            </span>
          </button>
        </div>

        {tab === "suggest" && (
          <div className="space-y-4">
            <MealBlock meals={currentMeals} label={t("currentMeals")} />

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {!loading && !suggestedMeals && (
              <div className="space-y-3">
                <MeasurementNudge />
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {t("ingredientsLabel")}
                  </p>
                  <textarea
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    rows={2}
                    placeholder={t("ingredientsPlaceholder")}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
                <div>
                  <div className="flex items-start gap-2 mb-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{t("specialRequestLabel")}</p>
                  </div>
                  <AiNoteTextarea
                    value={userNote}
                    onChange={setUserNote}
                    placeholder={t("specialRequestPlaceholder")}
                  />
                </div>
                <Button onClick={handleGenerate} disabled={loading} className="w-full">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t("getSuggestion")}
                </Button>
              </div>
            )}

            {loading && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <p className="text-xs text-primary font-medium">
                  {t("generating")}
                </p>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}

            {!loading && suggestedMeals && (
              <MealBlock
                meals={suggestedMeals}
                label={t("suggestedMeals")}
                variant="suggested"
              />
            )}

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
                    {t("newSuggestion")}
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
                    {t("approve")}
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
                  {t("saveToFavorites")}
                </Button>
              </div>
            )}
          </div>
        )}

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
                {t("noSaved")}
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
    </>
  );
}
