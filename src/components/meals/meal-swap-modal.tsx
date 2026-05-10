"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, UtensilsCrossed, ArrowLeft } from "lucide-react";
import { getMealPickerData, type MealCandidate } from "@/actions/meal-picker";
import { MEAL_LABELS, MEAL_LABEL_COLORS, isMealLabel, getLocalizedMealLabel } from "@/lib/meal-labels";
import { useUpdateMeal } from "@/hooks/use-meal-crud";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/lib/locale";

interface CandidateCardProps {
  candidate: MealCandidate;
  onClick: () => void;
}

function CandidateCard({ candidate, onClick }: CandidateCardProps) {
  const locale = useLocale() as Locale;
  const colorClass = isMealLabel(candidate.mealLabel) ? MEAL_LABEL_COLORS[candidate.mealLabel] : "";
  const displayLabel = isMealLabel(candidate.mealLabel)
    ? getLocalizedMealLabel(candidate.mealLabel, locale)
    : candidate.mealLabel;
  return (
    <button
      type="button"
      onClick={onClick}
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
      <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
        {candidate.calories !== null && <span>{candidate.calories} kcal</span>}
        {candidate.proteinG && <span>P: {candidate.proteinG}g</span>}
        {candidate.carbsG && <span>K: {candidate.carbsG}g</span>}
        {candidate.fatG && <span>Y: {candidate.fatG}g</span>}
      </div>
    </button>
  );
}

interface CandidateListProps {
  list: MealCandidate[];
  isLoading: boolean;
  onSelect: (c: MealCandidate) => void;
}

function CandidateList({ list, isLoading, onSelect }: CandidateListProps) {
  const t = useTranslations("meals.swap");
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
        <UtensilsCrossed className="h-8 w-8 opacity-40" />
        <p className="text-sm">{t("empty")}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {list.map((c) => (
        <CandidateCard key={c.id} candidate={c} onClick={() => onSelect(c)} />
      ))}
    </div>
  );
}

interface MealSwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealId: number;
  mealTime: string;
  mealLabel: string;
  dailyPlanId: number;
}

export function MealSwapModal({
  open,
  onOpenChange,
  mealId,
  mealTime,
  mealLabel,
}: MealSwapModalProps) {
  const t = useTranslations("meals.swap");
  const locale = useLocale() as Locale;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterLabel, setFilterLabel] = useState(mealLabel);
  const [pending, setPending] = useState<MealCandidate | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateMeal = useUpdateMeal();

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      setFilterLabel(mealLabel);
      setPending(null);
    }
  }, [open, mealLabel]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["meals.picker.swap", debouncedSearch],
    queryFn: () => getMealPickerData(debouncedSearch || undefined),
    staleTime: 60_000,
    enabled: open,
  });

  const filter = (list: MealCandidate[]) =>
    list.filter((c) => !filterLabel || c.mealLabel === filterLabel);

  const savedFiltered = filter(data?.saved ?? []);
  const frequentFiltered = filter(data?.frequent ?? []);
  const historyFiltered = filter(data?.history ?? []);

  const handleConfirm = () => {
    if (!pending) return;
    updateMeal.mutate(
      {
        mealId,
        data: {
          mealTime,
          mealLabel,
          content: pending.content,
          calories: pending.calories,
          proteinG: pending.proteinG,
          carbsG: pending.carbsG,
          fatG: pending.fatG,
        },
      },
      {
        onSuccess: () => {
          setPending(null);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] flex flex-col p-0">
        {pending ? (
          /* Confirm view */
          <div className="flex flex-col h-full p-4">
            <SheetHeader className="mb-4">
              <SheetTitle>{t("title")}</SheetTitle>
            </SheetHeader>
            <p className="text-sm text-muted-foreground mb-3">
              {t("confirmQuestion")}
            </p>
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1 mb-6">
              <p className="text-sm font-medium">{pending.content}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {pending.calories !== null && <span>{pending.calories} kcal</span>}
                {pending.proteinG && <span>P: {pending.proteinG}g</span>}
                {pending.carbsG && <span>K: {pending.carbsG}g</span>}
                {pending.fatG && <span>Y: {pending.fatG}g</span>}
              </div>
            </div>
            <div className="mt-auto flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 gap-2"
                onClick={() => setPending(null)}
                disabled={updateMeal.isPending}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("back")}
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={updateMeal.isPending}
              >
                {updateMeal.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("confirm")
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Search / list view */
          <>
            <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
              <SheetTitle>{t("title")}</SheetTitle>
            </SheetHeader>

            <div className="px-4 pb-2 space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterLabel || "all"} onValueChange={(v) => setFilterLabel(v === "all" ? "" : v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allMealTypes")}</SelectItem>
                  {MEAL_LABELS.map((label) => (
                    <SelectItem key={label} value={label}>
                      {getLocalizedMealLabel(label, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="saved" className="flex-1 flex flex-col min-h-0 px-4">
              <TabsList className="shrink-0 w-full grid grid-cols-3">
                <TabsTrigger value="saved">{t("tabSaved")}</TabsTrigger>
                <TabsTrigger value="frequent">{t("tabFrequent")}</TabsTrigger>
                <TabsTrigger value="history">{t("tabHistory")}</TabsTrigger>
              </TabsList>
              <TabsContent value="saved" className="flex-1 overflow-y-auto mt-2 pb-4">
                <CandidateList list={savedFiltered} isLoading={isLoading} onSelect={setPending} />
              </TabsContent>
              <TabsContent value="frequent" className="flex-1 overflow-y-auto mt-2 pb-4">
                <CandidateList list={frequentFiltered} isLoading={isLoading} onSelect={setPending} />
              </TabsContent>
              <TabsContent value="history" className="flex-1 overflow-y-auto mt-2 pb-4">
                <CandidateList list={historyFiltered} isLoading={isLoading} onSelect={setPending} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
