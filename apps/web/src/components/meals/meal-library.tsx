"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Trash2, UtensilsCrossed, ClipboardList, Plus, Star, Flame } from "lucide-react";
import { toast } from "sonner";
import {
  useSavedMealSuggestions,
  useDeleteSavedMealSuggestion,
} from "@/hooks/use-saved-meals";
import {
  useSavedDailyMealSuggestions,
  useDeleteDailyMealSuggestion,
  useApplyDailyMeals,
} from "@/hooks/use-meal-ai";
import { useUpcomingDailyPlans } from "@/hooks/use-plans";
import type { AIMeal } from "@/actions/ai-meals";
import { computeMealMacros } from "@/lib/meal-macros";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/lib/locale";
import { formatDate, parseDateOnly } from "@/lib/date-format";

function useFormatRelativeDate() {
  const t = useTranslations("meals.library");
  const locale = useLocale() as Locale;
  return (input: Date | string | null | undefined): string => {
    if (!input) return "";
    const date = typeof input === "string" ? new Date(input) : input;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return formatDate(date, locale, { day: "numeric", month: "long" });
    if (diffDays === 0) return t("today");
    if (diffDays === 1) return t("yesterday");
    if (diffDays < 7) return t("daysAgo", { count: diffDays });
    return formatDate(date, locale, {
      day: "numeric",
      month: "long",
      year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
    });
  };
}

function usePlanTypeLabels(): Record<string, string> {
  const t = useTranslations("meals.library.planType");
  return {
    workout: t("workout"),
    rest: t("rest"),
    swimming: t("swimming"),
    nutrition: t("nutrition"),
  };
}

function SavedMealsTab() {
  const t = useTranslations("meals.library");
  const { data: saved, isLoading } = useSavedMealSuggestions();
  const deleteSaved = useDeleteSavedMealSuggestion();
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);

  const labels = useMemo(() => {
    if (!saved) return [];
    return Array.from(new Set(saved.map((s) => s.mealLabel)));
  }, [saved]);

  const filtered = useMemo(() => {
    if (!saved) return [];
    const q = search.trim().toLowerCase();
    return saved.filter((s) => {
      if (labelFilter && s.mealLabel !== labelFilter) return false;
      if (!q) return true;
      return (
        s.content.toLowerCase().includes(q) ||
        s.mealLabel.toLowerCase().includes(q)
      );
    });
  }, [saved, labelFilter, search]);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {t("loading")}
      </p>
    );
  }

  if (!saved || saved.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <Star className="h-10 w-10 mx-auto text-muted-foreground opacity-20" />
        <div>
          <p className="text-sm font-medium">{t("emptySaved")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("emptySavedHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {labels.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={labelFilter === null ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setLabelFilter(null)}
          >
            {t("filterAll")}
          </Button>
          {labels.map((l) => (
            <Button
              key={l}
              variant={labelFilter === l ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setLabelFilter(l)}
            >
              {l}
            </Button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("noMatches")}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {item.mealLabel}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => {
                      deleteSaved.mutate(item.id);
                      toast.success(t("deleted"));
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm line-clamp-2">{item.content}</p>
                <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  {item.calories && <span>{item.calories} kcal</span>}
                  {item.proteinG && <span>P: {item.proteinG}g</span>}
                  {item.carbsG && <span>K: {item.carbsG}g</span>}
                  {item.fatG && <span>Y: {item.fatG}g</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplyPlanDialog({
  open,
  onOpenChange,
  mealList,
  planLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mealList: AIMeal[];
  planLabel: string;
}) {
  const t = useTranslations("meals.library");
  const locale = useLocale() as Locale;
  const PLAN_TYPE_LABELS = usePlanTypeLabels();
  const { data: upcomingPlans, isLoading } = useUpcomingDailyPlans();
  const applyMeals = useApplyDailyMeals();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleApply = () => {
    if (selectedId === null) {
      toast.error(t("selectDay"));
      return;
    }
    applyMeals.mutate(
      { dailyPlanId: selectedId, newMeals: mealList },
      {
        onSuccess: () => {
          toast.success(t("applied"));
          onOpenChange(false);
          setSelectedId(null);
        },
        onError: () => toast.error(t("applyFailed")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            {t("applyDialogTitle", { label: planLabel })}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {t("applyDialogBody", { count: mealList.length })}
        </p>
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("loading")}
            </p>
          ) : !upcomingPlans || upcomingPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("noUpcoming")}
            </p>
          ) : (
            upcomingPlans.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left rounded-lg border p-2 text-xs transition-colors ${
                  selectedId === p.id
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.dayName}</span>
                  {p.date && (
                    <span className="text-muted-foreground">
                      {formatDate(parseDateOnly(p.date), locale, { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {PLAN_TYPE_LABELS[p.planType] ?? p.planType}
                  {p.workoutTitle ? ` — ${p.workoutTitle}` : ""}
                </p>
              </button>
            ))
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={applyMeals.isPending || selectedId === null}
            className="flex-1"
          >
            {applyMeals.isPending ? t("applying") : t("apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DailyPlansTab() {
  const t = useTranslations("meals.library");
  const formatRelativeDate = useFormatRelativeDate();
  const PLAN_TYPE_LABELS = usePlanTypeLabels();
  const { data: plans, isLoading } = useSavedDailyMealSuggestions();
  const deletePlan = useDeleteDailyMealSuggestion();
  const [search, setSearch] = useState("");
  const [applyTarget, setApplyTarget] = useState<{
    meals: AIMeal[];
    label: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!plans) return [];
    const q = search.trim().toLowerCase();
    if (!q) return plans;
    return plans.filter((p) => {
      if (p.userNote?.toLowerCase().includes(q)) return true;
      return p.meals.some(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.mealLabel.toLowerCase().includes(q),
      );
    });
  }, [plans, search]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-5 w-12" />
              </div>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-7 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground opacity-20" />
        <div>
          <p className="text-sm font-medium">{t("noPlans")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("noPlansHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t("noPlanMatches")}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const macros = computeMealMacros(p.meals);
            const dateLabel = formatRelativeDate(p.createdAt);
            const planTypeLabel = PLAN_TYPE_LABELS[p.planType] ?? p.planType;
            const planTitle = p.userNote ?? t("planTitleSuffix", { type: planTypeLabel });
            const dialogLabel = p.userNote ?? t("planLabelDefault", { type: planTypeLabel, date: dateLabel });
            return (
              <Card
                key={p.id}
                className="hover:bg-accent/30 transition-colors"
              >
                <CardContent className="p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <h4 className="text-sm font-semibold leading-tight line-clamp-2">
                        {planTitle}
                      </h4>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {planTypeLabel}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {t("mealsCount", { count: p.meals.length })}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {dateLabel}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => {
                        deletePlan.mutate(p.id);
                        toast.success(t("planDeleted"));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className="text-[10px] h-5 gap-1 bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/20">
                      <Flame className="h-3 w-3" />
                      {macros.calories} kcal
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5 border-red-500/40 text-red-400">
                      P {macros.protein}g
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-400">
                      K {macros.carbs}g
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5 border-yellow-500/40 text-yellow-400">
                      Y {macros.fat}g
                    </Badge>
                  </div>

                  <ul className="text-xs space-y-0.5 border-l-2 border-muted pl-2.5">
                    {p.meals.slice(0, 4).map((m, i) => (
                      <li key={i} className="line-clamp-1">
                        <span className="text-muted-foreground tabular-nums">{m.mealTime}</span>{" "}
                        <span className="font-medium">{m.mealLabel}</span>
                        <span className="text-muted-foreground"> — {m.content}</span>
                      </li>
                    ))}
                    {p.meals.length > 4 && (
                      <li className="text-[10px] text-muted-foreground">
                        {t("moreMeals", { count: p.meals.length - 4 })}
                      </li>
                    )}
                  </ul>

                  <Button
                    size="sm"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() =>
                      setApplyTarget({ meals: p.meals, label: dialogLabel })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("applyToDay")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {applyTarget && (
        <ApplyPlanDialog
          open={!!applyTarget}
          onOpenChange={(v) => {
            if (!v) setApplyTarget(null);
          }}
          mealList={applyTarget.meals}
          planLabel={applyTarget.label}
        />
      )}
    </div>
  );
}

export function MealLibrary() {
  const t = useTranslations("meals.library");
  return (
    <Tabs defaultValue="meals">
      <TabsList className="grid grid-cols-2 w-full mb-4">
        <TabsTrigger value="meals" className="gap-1.5">
          <UtensilsCrossed className="h-4 w-4" />
          {t("tabMeals")}
        </TabsTrigger>
        <TabsTrigger value="plans" className="gap-1.5">
          <ClipboardList className="h-4 w-4" />
          {t("tabPlans")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="meals">
        <SavedMealsTab />
      </TabsContent>
      <TabsContent value="plans">
        <DailyPlansTab />
      </TabsContent>
    </Tabs>
  );
}
