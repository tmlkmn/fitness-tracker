"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LucideIcon } from "lucide-react";
import { Search, Clock, Star, History, ClipboardList } from "lucide-react";
import {
  getMealPickerData,
  type MealCandidate,
  type DailyPlanCandidate,
} from "@/actions/meal-picker";
import {
  MEAL_LABELS,
  MEAL_LABEL_COLORS,
  isMealLabel,
  getLocalizedMealLabel,
  type MealLabel,
} from "@/lib/meal-labels";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/lib/locale";
import { formatDate } from "@/lib/date-format";

export interface SelectedMeal {
  mealLabel: string;
  content: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

interface UnifiedMealPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeDailyPlanId?: number;
  onSelect: (meal: SelectedMeal) => void;
  onSelectDailyPlan?: (plan: DailyPlanCandidate) => void;
}

function candidateToSelected(c: MealCandidate): SelectedMeal {
  return {
    mealLabel: c.mealLabel,
    content: c.content,
    calories: c.calories !== null ? String(c.calories) : "",
    protein: c.proteinG ?? "",
    carbs: c.carbsG ?? "",
    fat: c.fatG ?? "",
  };
}

function MealCandidateCard({
  candidate,
  onSelect,
}: {
  candidate: MealCandidate;
  onSelect: () => void;
}) {
  const locale = useLocale() as Locale;
  const colorClass = isMealLabel(candidate.mealLabel)
    ? MEAL_LABEL_COLORS[candidate.mealLabel]
    : "";
  const displayLabel = isMealLabel(candidate.mealLabel)
    ? getLocalizedMealLabel(candidate.mealLabel, locale)
    : candidate.mealLabel;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border p-2.5 hover:bg-muted/50 transition-colors space-y-1"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge className={cn("text-[10px] h-4 px-1.5 border font-medium", colorClass)}>
          {displayLabel}
        </Badge>
        {candidate.meta && (
          <span className="text-[10px] text-muted-foreground">{candidate.meta}</span>
        )}
      </div>
      <p className="text-sm line-clamp-2">{candidate.content}</p>
      <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        {candidate.calories !== null && <span>{candidate.calories} kcal</span>}
        {candidate.proteinG && <span>P: {candidate.proteinG}g</span>}
        {candidate.carbsG && <span>K: {candidate.carbsG}g</span>}
        {candidate.fatG && <span>Y: {candidate.fatG}g</span>}
      </div>
    </button>
  );
}

function DailyPlanCard({
  plan,
  onSelect,
}: {
  plan: DailyPlanCandidate;
  onSelect: () => void;
}) {
  const t = useTranslations("meals.picker");
  const locale = useLocale() as Locale;
  const totalCals = plan.meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const dateLabel = plan.createdAt
    ? formatDate(plan.createdAt, locale, { day: "numeric", month: "short" })
    : "";
  const planTypeKey = plan.planType in { workout: 1, rest: 1, swimming: 1, nutrition: 1 }
    ? plan.planType as "workout" | "rest" | "swimming" | "nutrition"
    : null;
  const planTypeLabel = planTypeKey ? t(`planTypes.${planTypeKey}`) : plan.planType;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border p-2.5 hover:bg-muted/50 transition-colors space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
          {planTypeLabel}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {t("mealCountKcalDateShort", { count: plan.meals.length, kcal: totalCals, date: dateLabel })}
        </span>
      </div>
      {plan.userNote && (
        <p className="text-xs text-muted-foreground line-clamp-1 italic">
          &ldquo;{plan.userNote}&rdquo;
        </p>
      )}
      <ul className="text-xs text-foreground/80 space-y-0.5">
        {plan.meals.slice(0, 3).map((m, i) => {
          const mLabel = isMealLabel(m.mealLabel)
            ? getLocalizedMealLabel(m.mealLabel, locale)
            : m.mealLabel;
          return (
            <li key={i} className="line-clamp-1">
              <span className="text-muted-foreground">{m.mealTime}</span>{" "}
              <span className="font-medium">{mLabel}</span>{" "}
              —{" "}
              <span className="text-muted-foreground">{m.content}</span>
            </li>
          );
        })}
        {plan.meals.length > 3 && (
          <li className="text-[10px] text-muted-foreground">
            {t("moreCountShort", { count: plan.meals.length - 3 })}
          </li>
        )}
      </ul>
    </button>
  );
}

function EmptyState({
  icon: Icon,
  message,
  hint,
}: {
  icon: LucideIcon;
  message: string;
  hint?: string;
}) {
  return (
    <div className="text-center py-8 px-4 space-y-2">
      <Icon className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
      <p className="text-sm font-medium">{message}</p>
      {hint && (
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[16rem] mx-auto">
          {hint}
        </p>
      )}
    </div>
  );
}

export function UnifiedMealPicker({
  open,
  onOpenChange,
  excludeDailyPlanId,
  onSelect,
  onSelectDailyPlan,
}: UnifiedMealPickerProps) {
  const t = useTranslations("meals.picker");
  const locale = useLocale() as Locale;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<MealLabel | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleTabChange = () => setLabelFilter(null);

  const { data, isLoading } = useQuery({
    queryKey: ["meal-picker", debouncedSearch, excludeDailyPlanId ?? 0],
    queryFn: () => getMealPickerData(debouncedSearch, excludeDailyPlanId),
    enabled: open,
    staleTime: 30_000,
  });

  const handlePick = (c: MealCandidate) => {
    onSelect(candidateToSelected(c));
    onOpenChange(false);
  };

  const handlePickPlan = (p: DailyPlanCandidate) => {
    if (onSelectDailyPlan) {
      onSelectDailyPlan(p);
      onOpenChange(false);
    }
  };

  const filteredFrequent = labelFilter
    ? (data?.frequent ?? []).filter((c) => c.mealLabel === labelFilter)
    : (data?.frequent ?? []);
  const filteredHistory = labelFilter
    ? (data?.history ?? []).filter((c) => c.mealLabel === labelFilter)
    : (data?.history ?? []);
  const filteredSaved = labelFilter
    ? (data?.saved ?? []).filter((c) => c.mealLabel === labelFilter)
    : (data?.saved ?? []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-hidden p-4 flex flex-col gap-3">
        <DialogHeader className="space-y-0">
          <DialogTitle className="text-base">{t("titleAlt")}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("searchShort")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Tabs defaultValue="frequent" className="flex-1 flex flex-col min-h-0" onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-4 w-full h-9">
            <TabsTrigger value="frequent" className="text-[10px] gap-1 px-1">
              <Clock className="h-3 w-3" />
              {t("tabFrequent")}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-[10px] gap-1 px-1">
              <History className="h-3 w-3" />
              {t("tabHistory")}
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-[10px] gap-1 px-1">
              <Star className="h-3 w-3" />
              {t("tabSaved")}
            </TabsTrigger>
            <TabsTrigger
              value="daily"
              className="text-[10px] gap-1 px-1"
              disabled={!onSelectDailyPlan}
            >
              <ClipboardList className="h-3 w-3" />
              {t("tabDaily")}
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-1.5 overflow-x-auto py-2 scrollbar-none shrink-0">
            <button
              onClick={() => setLabelFilter(null)}
              className={cn(
                "shrink-0 text-[10px] rounded-full border px-2.5 py-0.5 transition-colors whitespace-nowrap",
                !labelFilter
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground/40",
              )}
            >
              {t("filterAll")}
            </button>
            {MEAL_LABELS.map((label) => (
              <button
                key={label}
                onClick={() => setLabelFilter((l) => (l === label ? null : label))}
                className={cn(
                  "shrink-0 text-[10px] rounded-full border px-2.5 py-0.5 transition-colors whitespace-nowrap",
                  labelFilter === label
                    ? cn("border", MEAL_LABEL_COLORS[label])
                    : "border-border text-muted-foreground hover:border-foreground/40",
                )}
              >
                {getLocalizedMealLabel(label, locale)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t("loadingShort")}</p>
            ) : (
              <>
                <TabsContent value="frequent" className="space-y-2 mt-0">
                  {filteredFrequent.length ? (
                    filteredFrequent.map((c) => (
                      <MealCandidateCard
                        key={c.id}
                        candidate={c}
                        onSelect={() => handlePick(c)}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={Clock}
                      message={t("emptyFrequentShort")}
                      hint={t("emptyFrequentHint")}
                    />
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-2 mt-0">
                  {filteredHistory.length ? (
                    filteredHistory.map((c) => (
                      <MealCandidateCard
                        key={c.id}
                        candidate={c}
                        onSelect={() => handlePick(c)}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={History}
                      message={t("emptyHistoryShort")}
                      hint={t("emptyHistoryHint")}
                    />
                  )}
                </TabsContent>

                <TabsContent value="saved" className="space-y-2 mt-0">
                  {filteredSaved.length ? (
                    filteredSaved.map((c) => (
                      <MealCandidateCard
                        key={c.id}
                        candidate={c}
                        onSelect={() => handlePick(c)}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={Star}
                      message={t("emptySavedShort")}
                      hint={t("emptySavedHint")}
                    />
                  )}
                </TabsContent>

                <TabsContent value="daily" className="space-y-2 mt-0">
                  {data?.dailyPlans.length ? (
                    data.dailyPlans.map((p) => (
                      <DailyPlanCard
                        key={p.id}
                        plan={p}
                        onSelect={() => handlePickPlan(p)}
                      />
                    ))
                  ) : (
                    <EmptyState
                      icon={ClipboardList}
                      message={t("emptyDailyShort")}
                      hint={t("emptyDailyHint")}
                    />
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
        >
          {t("close")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
