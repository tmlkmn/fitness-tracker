"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Trash2, UtensilsCrossed, ClipboardList, Plus, Star } from "lucide-react";
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

const PLAN_TYPE_LABELS: Record<string, string> = {
  workout: "Antrenman",
  rest: "Dinlenme",
  swimming: "Yüzme",
  nutrition: "Beslenme",
};

function SavedMealsTab() {
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
        Yükleniyor…
      </p>
    );
  }

  if (!saved || saved.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <Star className="h-10 w-10 mx-auto text-muted-foreground opacity-20" />
        <div>
          <p className="text-sm font-medium">Henüz kayıtlı öğün yok</p>
          <p className="text-xs text-muted-foreground mt-1">
            Yeni öğün eklerken &ldquo;Favorilere kaydet&rdquo;i işaretle
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
          placeholder="Ara..."
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
            Tümü
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
          Eşleşen öğün yok
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
                      toast.success("Öğün silindi");
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
  const { data: upcomingPlans, isLoading } = useUpcomingDailyPlans();
  const applyMeals = useApplyDailyMeals();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleApply = () => {
    if (selectedId === null) {
      toast.error("Bir gün seç");
      return;
    }
    applyMeals.mutate(
      { dailyPlanId: selectedId, newMeals: mealList },
      {
        onSuccess: () => {
          toast.success("Öğünler eklendi");
          onOpenChange(false);
          setSelectedId(null);
        },
        onError: () => toast.error("Eklenemedi"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            &ldquo;{planLabel}&rdquo; Planını Uygula
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Plan {mealList.length} öğün içeriyor. Uygulanacak gün mevcut öğünlerin
          üzerine yazılır.
        </p>
        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Yükleniyor…
            </p>
          ) : !upcomingPlans || upcomingPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Uygun gün bulunamadı
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
                      {new Date(p.date + "T00:00:00").toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                      })}
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
            İptal
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={applyMeals.isPending || selectedId === null}
            className="flex-1"
          >
            {applyMeals.isPending ? "Uygulanıyor…" : "Uygula"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DailyPlansTab() {
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
      <p className="text-sm text-muted-foreground text-center py-8">
        Yükleniyor…
      </p>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-10 space-y-3">
        <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground opacity-20" />
        <div>
          <p className="text-sm font-medium">Kayıtlı günlük plan yok</p>
          <p className="text-xs text-muted-foreground mt-1">
            Öğün listesinde &ldquo;AI ile Programı Değiştir&rdquo;den oluşturup kaydet
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
          placeholder="Ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Eşleşen plan yok
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const totalCals = p.meals.reduce(
              (s, m) => s + (m.calories ?? 0),
              0,
            );
            const dateLabel = p.createdAt
              ? new Date(p.createdAt).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "short",
                })
              : "";
            const planLabel =
              p.userNote ??
              `${PLAN_TYPE_LABELS[p.planType] ?? p.planType} — ${dateLabel}`;
            return (
              <Card key={p.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs">
                      {PLAN_TYPE_LABELS[p.planType] ?? p.planType}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {p.meals.length} öğün · {totalCals} kcal · {dateLabel}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => {
                          deletePlan.mutate(p.id);
                          toast.success("Plan silindi");
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {p.userNote && (
                    <p className="text-xs text-muted-foreground italic line-clamp-1">
                      &ldquo;{p.userNote}&rdquo;
                    </p>
                  )}
                  <ul className="text-xs space-y-0.5">
                    {p.meals.slice(0, 4).map((m, i) => (
                      <li key={i} className="line-clamp-1">
                        <span className="text-muted-foreground">{m.mealTime}</span>{" "}
                        <span className="font-medium">{m.mealLabel}</span> —{" "}
                        <span className="text-muted-foreground">
                          {m.content}
                        </span>
                      </li>
                    ))}
                    {p.meals.length > 4 && (
                      <li className="text-[10px] text-muted-foreground">
                        +{p.meals.length - 4} daha…
                      </li>
                    )}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs gap-1"
                    onClick={() =>
                      setApplyTarget({ meals: p.meals, label: planLabel })
                    }
                  >
                    <Plus className="h-3 w-3" />
                    Günün planına ekle
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
  return (
    <Tabs defaultValue="meals">
      <TabsList className="grid grid-cols-2 w-full mb-4">
        <TabsTrigger value="meals" className="gap-1.5">
          <UtensilsCrossed className="h-4 w-4" />
          Öğünler
        </TabsTrigger>
        <TabsTrigger value="plans" className="gap-1.5">
          <ClipboardList className="h-4 w-4" />
          Günlük Planlar
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
