"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSavedMealSuggestions } from "@/hooks/use-saved-meals";
import { deleteSavedMealSuggestion } from "@/actions/saved-meals";
import { Trash2, UtensilsCrossed } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface MealTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (meal: {
    mealLabel: string;
    content: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  }) => void;
}

export function MealTemplatePicker({ open, onOpenChange, onSelect }: MealTemplatePickerProps) {
  const { data: saved, isLoading } = useSavedMealSuggestions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const labels = useMemo(() => {
    if (!saved) return [];
    const set = new Set(saved.map((s) => s.mealLabel));
    return Array.from(set);
  }, [saved]);

  const filtered = useMemo(() => {
    if (!saved) return [];
    return saved.filter((s) => {
      if (filter && s.mealLabel !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.content.toLowerCase().includes(q) || s.mealLabel.toLowerCase().includes(q);
      }
      return true;
    });
  }, [saved, filter, search]);

  const handleSelect = (item: (typeof saved extends (infer T)[] | undefined ? T : never)) => {
    onSelect({
      mealLabel: item.mealLabel,
      content: item.content,
      calories: item.calories?.toString() ?? "",
      protein: item.proteinG ?? "",
      carbs: item.carbsG ?? "",
      fat: item.fatG ?? "",
    });
    onOpenChange(false);
  };

  const handleDelete = async (id: number) => {
    await deleteSavedMealSuggestion(id);
    queryClient.invalidateQueries({ queryKey: ["saved-meal-suggestions"] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kayıtlı Öğünler</DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {labels.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={filter === null ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setFilter(null)}
            >
              Tümü
            </Button>
            {labels.map((l) => (
              <Button
                key={l}
                variant={filter === l ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setFilter(l)}
              >
                {l}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <UtensilsCrossed className="h-8 w-8 mx-auto text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">Kayıtlı öğün bulunamadı</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{item.mealLabel}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm line-clamp-2">{item.content}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {item.calories && <span>{item.calories} kcal</span>}
                  {item.proteinG && <span>P: {item.proteinG}g</span>}
                  {item.carbsG && <span>K: {item.carbsG}g</span>}
                  {item.fatG && <span>Y: {item.fatG}g</span>}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => handleSelect(item)}
                >
                  Seç
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
