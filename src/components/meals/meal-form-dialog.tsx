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
import { useCreateMeal, useUpdateMeal } from "@/hooks/use-meal-crud";

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
}

export function MealFormDialog({
  open,
  onOpenChange,
  dailyPlanId,
  meal,
}: MealFormDialogProps) {
  const isEdit = !!meal?.id;
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();

  const [mealTime, setMealTime] = useState(meal?.mealTime ?? "08:00");
  const [mealLabel, setMealLabel] = useState(meal?.mealLabel ?? "");
  const [content, setContent] = useState(meal?.content ?? "");
  const [calories, setCalories] = useState(meal?.calories?.toString() ?? "");
  const [protein, setProtein] = useState(meal?.proteinG ?? "");
  const [carbs, setCarbs] = useState(meal?.carbsG ?? "");
  const [fat, setFat] = useState(meal?.fatG ?? "");

  const isPending = createMeal.isPending || updateMeal.isPending;

  const handleSubmit = (e: React.FormEvent) => {
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

    const onSuccess = () => onOpenChange(false);

    if (isEdit && meal?.id) {
      updateMeal.mutate({ mealId: meal.id, data }, { onSuccess });
    } else {
      createMeal.mutate({ dailyPlanId, data }, { onSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Öğünü Düzenle" : "Yeni Öğün Ekle"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mealTime" className="text-xs">
                Saat
              </Label>
              <Input
                id="mealTime"
                type="time"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mealLabel" className="text-xs">
                Öğün Adı *
              </Label>
              <Input
                id="mealLabel"
                placeholder="Kahvaltı"
                value={mealLabel}
                onChange={(e) => setMealLabel(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content" className="text-xs">
              İçerik *
            </Label>
            <textarea
              id="content"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="2 yumurta, 1 dilim tam buğday ekmeği..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="calories" className="text-xs">
                Kalori (kcal)
              </Label>
              <Input
                id="calories"
                type="number"
                min="0"
                placeholder="350"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="protein" className="text-xs">
                Protein (g)
              </Label>
              <Input
                id="protein"
                type="number"
                min="0"
                step="0.1"
                placeholder="25"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carbs" className="text-xs">
                Karbonhidrat (g)
              </Label>
              <Input
                id="carbs"
                type="number"
                min="0"
                step="0.1"
                placeholder="40"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fat" className="text-xs">
                Yağ (g)
              </Label>
              <Input
                id="fat"
                type="number"
                min="0"
                step="0.1"
                placeholder="15"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
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
    </Dialog>
  );
}
