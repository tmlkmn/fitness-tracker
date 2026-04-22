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
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-lg border p-2.5 hover:bg-muted/50 transition-colors space-y-1"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
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

const PLAN_TYPE_LABELS: Record<string, string> = {
  workout: "Antrenman",
  rest: "Dinlenme",
  swimming: "Yüzme",
  nutrition: "Beslenme",
};

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
          {PLAN_TYPE_LABELS[plan.planType] ?? plan.planType}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {plan.meals.length} öğün · {totalCals} kcal · {dateLabel}
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
            <span className="font-medium">{m.mealLabel}</span> —{" "}
            <span className="text-muted-foreground">{m.content}</span>
          </li>
        ))}
        {plan.meals.length > 3 && (
          <li className="text-[10px] text-muted-foreground">
            +{plan.meals.length - 3} daha…
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

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-hidden p-4 flex flex-col gap-3">
        <DialogHeader className="space-y-0">
          <DialogTitle className="text-base">Öğün Seç</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Ara (içerik, isim)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Tabs defaultValue="frequent" className="flex-1 flex flex-col min-h-0">
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

          <div className="flex-1 overflow-y-auto mt-3 -mx-1 px-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Yükleniyor…
              </p>
            ) : (
              <>
                <TabsContent value="frequent" className="space-y-2 mt-0">
                  {data?.frequent.length ? (
                    data.frequent.map((c) => (
                      <MealCandidateCard
                        key={c.id}
                        candidate={c}
                        onSelect={() => handlePick(c)}
                      />
                    ))
                  ) : (
                    <EmptyState message="Henüz sık kullandığın öğün yok" />
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-2 mt-0">
                  {data?.history.length ? (
                    data.history.map((c) => (
                      <MealCandidateCard
                        key={c.id}
                        candidate={c}
                        onSelect={() => handlePick(c)}
                      />
                    ))
                  ) : (
                    <EmptyState message="Önceki günlerden öğün bulunamadı" />
                  )}
                </TabsContent>

                <TabsContent value="saved" className="space-y-2 mt-0">
                  {data?.saved.length ? (
                    data.saved.map((c) => (
                      <MealCandidateCard
                        key={c.id}
                        candidate={c}
                        onSelect={() => handlePick(c)}
                      />
                    ))
                  ) : (
                    <EmptyState message="Henüz favori öğün kaydetmedin" />
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
                    <EmptyState message="Kayıtlı günlük plan yok" />
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
