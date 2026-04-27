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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEAL_LABELS, isMealLabel, type MealLabel } from "@/lib/meal-labels";
import { useCreateMeal, useUpdateMeal } from "@/hooks/use-meal-crud";
import { useUserProfile } from "@/hooks/use-user";
import { getDefaultMealTime, isWeekendDate } from "@/lib/meal-time-defaults";
import { saveMealSuggestion } from "@/actions/saved-meals";
import { UnifiedMealPicker } from "./unified-meal-picker";
import { FoodReferencePopover } from "./food-reference-popover";
import { IconPicker } from "@/components/ui/icon-picker";
import { BookOpen, X } from "lucide-react";
import { multiplyFood, formatScaledEntry, type FoodLike } from "@/lib/food-math";
import { useDialogCloseGuard } from "@/hooks/use-dialog-close-guard";

interface MealData {
  id?: number;
  mealTime: string;
  mealLabel: string;
  content: string;
  calories?: number | null;
  proteinG?: string | null;
  carbsG?: string | null;
  fatG?: string | null;
  icon?: string | null;
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
  // mealLabel is constrained to the canonical vocabulary (matches the DB
  // CHECK constraint). Existing meals that aren't in the set fall back to
  // empty so the user must pick a valid label before saving.
  const [mealLabel, setMealLabel] = useState<MealLabel | "">(
    isMealLabel(meal?.mealLabel) ? meal.mealLabel : "",
  );
  const [content, setContent] = useState(meal?.content ?? "");
  const [calories, setCalories] = useState(meal?.calories?.toString() ?? "");
  const [protein, setProtein] = useState(meal?.proteinG ?? "");
  const [carbs, setCarbs] = useState(meal?.carbsG ?? "");
  const [fat, setFat] = useState(meal?.fatG ?? "");
  const [icon, setIcon] = useState<string | null>(meal?.icon ?? null);
  const [saveAsFavorite, setSaveAsFavorite] = useState(false);

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);

  type AddedFood = {
    key: string;
    food: FoodLike;
    multiplier: number;
    scaled: ReturnType<typeof multiplyFood>;
  };
  const [addedFoods, setAddedFoods] = useState<AddedFood[]>([]);

  const isPending = createMeal.isPending || updateMeal.isPending;

  const initialMealLabel: MealLabel | "" = isMealLabel(meal?.mealLabel)
    ? meal.mealLabel
    : "";
  const isDirty =
    !isPending &&
    (mealLabel !== initialMealLabel ||
      content !== (meal?.content ?? "") ||
      calories !== (meal?.calories?.toString() ?? "") ||
      protein !== (meal?.proteinG ?? "") ||
      carbs !== (meal?.carbsG ?? "") ||
      fat !== (meal?.fatG ?? "") ||
      icon !== (meal?.icon ?? null) ||
      addedFoods.length > 0);

  const guardedOpenChange = useDialogCloseGuard(isDirty, onOpenChange);

  const handlePickerSelect = (data: {
    mealLabel: string;
    content: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  }) => {
    // Picker sources (saved meals, history) may carry legacy free-form
    // labels. Coerce to canonical or empty so the user re-confirms.
    setMealLabel(isMealLabel(data.mealLabel) ? data.mealLabel : "");
    setContent(data.content);
    setCalories(data.calories);
    setProtein(data.protein);
    setCarbs(data.carbs);
    setFat(data.fat);
  };

  // (c) Food reference: append to content and add scaled macros
  const handleAddFood = (food: FoodLike, multiplier: number) => {
    const scaled = multiplyFood(food, multiplier);
    const entry = formatScaledEntry(food, multiplier);
    setContent((prev) => (prev ? `${prev}, ${entry}` : entry));
    setCalories((prev) => String((parseInt(prev) || 0) + scaled.calories));
    setProtein((prev) => String(Math.round(((parseFloat(prev) || 0) + scaled.protein) * 10) / 10));
    setCarbs((prev) => String(Math.round(((parseFloat(prev) || 0) + scaled.carbs) * 10) / 10));
    setFat((prev) => String(Math.round(((parseFloat(prev) || 0) + scaled.fat) * 10) / 10));
    setAddedFoods((prev) => [
      ...prev,
      { key: `${food.name}-${Date.now()}`, food, multiplier, scaled },
    ]);
  };

  const handleRemoveAddedFood = (key: string) => {
    const item = addedFoods.find((f) => f.key === key);
    if (!item) return;
    const entry = formatScaledEntry(item.food, item.multiplier);
    setAddedFoods((prev) => prev.filter((f) => f.key !== key));
    setContent((prev) => {
      const parts = prev.split(",").map((s) => s.trim());
      const idx = parts.findIndex((p) => p === entry);
      if (idx >= 0) parts.splice(idx, 1);
      return parts.join(", ");
    });
    setCalories((prev) => String(Math.max(0, (parseInt(prev) || 0) - item.scaled.calories)));
    setProtein((prev) =>
      String(Math.max(0, Math.round(((parseFloat(prev) || 0) - item.scaled.protein) * 10) / 10)),
    );
    setCarbs((prev) =>
      String(Math.max(0, Math.round(((parseFloat(prev) || 0) - item.scaled.carbs) * 10) / 10)),
    );
    setFat((prev) =>
      String(Math.max(0, Math.round(((parseFloat(prev) || 0) - item.scaled.fat) * 10) / 10)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMealLabel(mealLabel) || !content.trim()) return;

    const data = {
      mealTime: mealTime || "08:00",
      mealLabel,
      content: content.trim(),
      calories: calories ? parseInt(calories) : null,
      proteinG: protein || null,
      carbsG: carbs || null,
      fatG: fat || null,
      icon: icon || null,
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
    <Dialog open={open} onOpenChange={guardedOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto p-4 gap-3">
        <DialogHeader className="space-y-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">
              {isEdit ? "Öğünü Düzenle" : "Yeni Öğün Ekle"}
            </DialogTitle>
            {!isEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 mr-6 gap-1 text-xs"
                type="button"
                onClick={() => setPickerOpen(true)}
                title="Öğün seç"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Seç
              </Button>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
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
              <div className="flex gap-1.5">
                <IconPicker value={icon} onChange={setIcon} className="h-9 w-9" />
                <Select
                  value={mealLabel || undefined}
                  onValueChange={(v) => setMealLabel(v as MealLabel)}
                >
                  <SelectTrigger id="mealLabel" className="h-9 flex-1">
                    <SelectValue placeholder="Seç..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_LABELS.map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            {addedFoods.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {addedFoods.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => handleRemoveAddedFood(f.key)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/20"
                    title="Kaldır"
                  >
                    {formatScaledEntry(f.food, f.multiplier)} · {f.scaled.calories}kcal
                    <X className="h-2.5 w-2.5" />
                  </button>
                ))}
              </div>
            )}
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

      {pickerOpen && (
        <UnifiedMealPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          excludeDailyPlanId={dailyPlanId}
          onSelect={handlePickerSelect}
        />
      )}
    </Dialog>
  );
}
