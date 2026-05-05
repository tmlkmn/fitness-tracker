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
import { Search, UtensilsCrossed, Clock, Star, History, ClipboardList } from "lucide-react";
import {
  getMealPickerData,
  type MealCandidate,
  type DailyPlanCandidate,
} from "@/actions/meal-picker";
import {
  MEAL_LABELS,
  MEAL_LABEL_COLORS,
  isMealLabel,
  type MealLabel,
} from "@/lib/meal-labels";
import { cn } from "@/lib/utils";

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
  const colorClass = isMealLabel(candidate.mealLabel)
    ? MEAL_LABEL_COLORS[candidate.mealLabel]
    : "";
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border p-2.5 hover:bg-muted/50 transition-colors space-y-1"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge className={cn("text-[10px] h-4 px-1.5 border font-medium", colorClass)}>
          {candidate.mealLabel}
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
  const totalCals = plan.meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const dateLabel = plan.createdAt
    ? new Date(plan.createdAt).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      })
    : "";
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border p-2.5 hover:bg-muted/50 transition-colors space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
          {plan.planType}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {plan.meals.length} öğün • {totalCals} kcal • {dateLabel}
        </span>
      </div>
      {plan.userNote && (
        <p className="text-xs text-muted-foreground line-clamp-1 italic">
          &ldquo;{plan.userNote}&rdquo;
        </p>
      )}
      <ul className="text-xs text-foreground/80 space-y-0.5">
        {plan.meals.slice(0, 3).map((m, i) => (
          <li key={i} className="line-clamp-1">
            <span className="text-muted-foreground">{m.mealTime}</span>{" "}
            <span className="font-medium">{m.mealLabel}</span>{" "}
            —{" "}
            <span className="text-muted-foreground">{m.content}</span>
          </li>
        ))}
        {plan.meals.length > 3 && (
          <li className="text-[10px] text-muted-foreground">
            +{plan.meals.length - 3} daha
          </li>
        )}
      </ul>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 space-y-2">
      <UtensilsCrossed className="h-8 w-8 mx-auto text-muted-foreground opacity-20" />
      <p className="text-sm text-muted-foreground">{message}</p>
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
          <DialogTitle className="text-base">Öğünlerimden Seç</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Tabs defaultValue="frequent" className="flex-1 flex flex-col min-h-0" onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-4 w-full h-9">
            <TabsTrigger value="frequent" className="text-[10px] gap-1 px-1">
              <Clock className="h-3 w-3" />
              Sık
            </TabsTrigger>
            <TabsTrigger value="history" className="text-[10px] gap-1 px-1">
              <History className="h-3 w-3" />
              Geçmiş
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-[10px] gap-1 px-1">
              <Star className="h-3 w-3" />
              Kayıtlı
            </TabsTrigger>
            <TabsTrigger
              value="daily"
              className="text-[10px] gap-1 px-1"
              disabled={!onSelectDailyPlan}
            >
              <ClipboardList className="h-3 w-3" />
              Günlük
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
              Tümü
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
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Yükleniyor...</p>
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
                    <EmptyState message="Henüz sık kullanılan öğün yok" />
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
                    <EmptyState message="Geçmiş öğün bulunamadı" />
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
                    <EmptyState message="Kayıtlı öğün bulunamadı" />
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
                    <EmptyState message="Kayıtlı günlük plan bulunamadı" />
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
          Kapat
        </Button>
      </DialogContent>
    </Dialog>
  );
}
