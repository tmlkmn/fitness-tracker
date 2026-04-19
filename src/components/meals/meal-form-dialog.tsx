"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateMeal, useUpdateMeal } from "@/hooks/use-meal-crud";
import { useUserProfile } from "@/hooks/use-user";
import { getDefaultMealTime, isWeekendDate } from "@/lib/meal-time-defaults";
import { saveMealSuggestion } from "@/actions/saved-meals";
import { MealTemplatePicker } from "./meal-template-picker";
import { MealCopyPicker } from "./meal-copy-picker";
import { RecentMealChips } from "./recent-meal-chips";
import { FoodReferencePopover } from "./food-reference-popover";
import { Star, Copy } from "lucide-react";
import type { TurkishFood } from "@/data/turkish-foods";

interface MealData {
  id?: number;
  mealTime: string;
  mealLabel: string;
  content: string;
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
}

interface MealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyPlanId: number;
  meal?: MealData;
  planDate?: string;
}

export function MealFormDialog({
  open,
  onOpenChange,
  dailyPlanId,
  meal,
  planDate,
}: MealFormDialogProps) {
  const isEdit = !!meal?.id;
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const { data: profile } = useUserProfile();

  // Smart meal time default: use routine if available
  const getSmartDefault = () => {
    if (meal?.mealTime) return meal.mealTime;
    if (!profile || !planDate) return "08:00";
    const isWeekend = isWeekendDate(planDate);
    const routine = isWeekend
      ? (profile.weekendRoutine as { time: string; event: string }[] | null) ?? (profile.dailyRoutine as { time: string; event: string }[] | null)
      : (profile.dailyRoutine as { time: string; event: string }[] | null);
    return getDefaultMealTime("", routine);
  };

  const [mealTime, setMealTime] = useState(getSmartDefault);
  const [mealLabel, setMealLabel] = useState(meal?.mealLabel ?? "");
  const [content, setContent] = useState(meal?.content ?? "");
  const [calories, setCalories] = useState(meal?.calories?.toString() ?? "");
  const [protein, setProtein] = useState(meal?.proteinG ?? "");
  const [carbs, setCarbs] = useState(meal?.carbsG ?? "");
  const [fat, setFat] = useState(meal?.fatG ?? "");
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);

  // Picker states
  const [templateOpen, setTemplateOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);

  const isPending = createMeal.isPending || updateMeal.isPending;

  const fillForm = (data: {
    mealLabel?: string;
    content: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  }) => {
    if (data.mealLabel) setMealLabel(data.mealLabel);
    setContent(data.content);
    setCalories(data.calories);
    setProtein(data.protein);
    setCarbs(data.carbs);
    setFat(data.fat);
  };

  // (c) Food reference: append to content and add macros
  const handleAddFood = (food: TurkishFood) => {
    const entry = `${food.name} (${food.portion})`;
    setContent((prev) => (prev ? `${prev}, ${entry}` : entry));
    setCalories((prev) => String((parseInt(prev) || 0) + food.calories));
    setProtein((prev) => String(Math.round(((parseFloat(prev) || 0) + food.protein) * 10) / 10));
    setCarbs((prev) => String(Math.round(((parseFloat(prev) || 0) + food.carbs) * 10) / 10));
    setFat((prev) => String(Math.round(((parseFloat(prev) || 0) + food.fat) * 10) / 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealLabel.trim() || !content.trim()) return;

    const data = {
      mealTime: mealTime || "08:00",
      mealLabel: mealLabel.trim(),
      content: content.trim(),
      calories: calories ? parseInt(calories) : null,
      proteinG: protein || null,
      carbsG: carbs || null,
      fatG: fat || null,
    };

    const onSuccess = async () => {
      // (b) Save as favorite if checked
      if (saveAsFavorite && !isEdit) {
        try {
          await saveMealSuggestion({
            mealLabel: data.mealLabel,
            content: data.content,
            calories: data.calories,
            proteinG: data.proteinG,
            carbsG: data.carbsG,
            fatG: data.fatG,
          });
        } catch {
          // Silently fail — the meal is already saved
        }
      }
      onOpenChange(false);
    };

    if (isEdit && meal?.id) {
      updateMeal.mutate({ mealId: meal.id, data }, { onSuccess });
    } else {
      createMeal.mutate({ dailyPlanId, data }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto p-4 gap-3">
        <DialogHeader className="space-y-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">
              {isEdit ? "Öğünü Düzenle" : "Yeni Öğün Ekle"}
            </DialogTitle>
            {!isEdit && (
              <div className="flex gap-0.5 mr-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  type="button"
                  onClick={() => setTemplateOpen(true)}
                  title="Kayıtlı öğünler"
                >
                  <Star className="h-3.5 w-3.5" />
                </Button>
                {mealLabel && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    type="button"
                    onClick={() => setCopyOpen(true)}
                    title="Önceki günden kopyala"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Recent meals quick select — only in create mode */}
          {!isEdit && (
            <RecentMealChips
              onSelect={(m) => {
                fillForm(m);
                if (m.mealLabel) setMealLabel(m.mealLabel);
              }}
            />
          )}

          <div className="grid grid-cols-[1fr_1.5fr] gap-2">
            <div className="space-y-1">
              <Label htmlFor="mealTime" className="text-xs text-muted-foreground">
                Saat
              </Label>
              <Input
                id="mealTime"
                type="time"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mealLabel" className="text-xs text-muted-foreground">
                Öğün Adı *
              </Label>
              <Input
                id="mealLabel"
                placeholder="Kahvaltı"
                value={mealLabel}
                onChange={(e) => setMealLabel(e.target.value)}
                required
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Label htmlFor="content" className="text-xs text-muted-foreground">
                İçerik *
              </Label>
              <FoodReferencePopover onAdd={handleAddFood} />
            </div>
            <textarea
              id="content"
              className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder="2 yumurta, 1 dilim tam buğday ekmeği..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {/* Macros */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Besin Değerleri</p>
            <div className="grid grid-cols-4 gap-1.5">
              <div className="space-y-0.5">
                <Label htmlFor="calories" className="text-[10px] text-muted-foreground/70">
                  Kalori
                </Label>
                <Input
                  id="calories"
                  type="number"
                  min="0"
                  placeholder="350"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="h-8 px-2 text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="protein" className="text-[10px] text-muted-foreground/70">
                  Protein
                </Label>
                <Input
                  id="protein"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="25g"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="h-8 px-2 text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="carbs" className="text-[10px] text-muted-foreground/70">
                  Karb
                </Label>
                <Input
                  id="carbs"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="40g"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="h-8 px-2 text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="fat" className="text-[10px] text-muted-foreground/70">
                  Yağ
                </Label>
                <Input
                  id="fat"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="15g"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="h-8 px-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Save as favorite checkbox */}
          {!isEdit && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="saveAsFavorite"
                checked={saveAsFavorite}
                onCheckedChange={(checked) => setSaveAsFavorite(!!checked)}
              />
              <Label htmlFor="saveAsFavorite" className="text-xs text-muted-foreground cursor-pointer">
                Favorilere kaydet
              </Label>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              İptal
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Pickers */}
      {templateOpen && (
        <MealTemplatePicker
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          onSelect={fillForm}
        />
      )}
      {copyOpen && (
        <MealCopyPicker
          open={copyOpen}
          onOpenChange={setCopyOpen}
          mealLabel={mealLabel}
          dailyPlanId={dailyPlanId}
          onSelect={fillForm}
        />
      )}
    </Dialog>
  );
}
