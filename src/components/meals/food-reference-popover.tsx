"use client";

import { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus } from "lucide-react";
import { TURKISH_FOODS, CATEGORY_LABELS, type TurkishFood } from "@/data/turkish-foods";

interface FoodReferencePopoverProps {
  onAdd: (food: TurkishFood) => void;
}

export function FoodReferencePopover({ onAdd }: FoodReferencePopoverProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<TurkishFood["category"] | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return TURKISH_FOODS.filter((f) => {
      if (category && f.category !== category) return false;
      if (search) return f.name.toLowerCase().includes(search.toLowerCase());
      return true;
    });
  }, [search, category]);

  const categories = Object.entries(CATEGORY_LABELS) as [TurkishFood["category"], string][];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-5 w-5" type="button">
          <BookOpen className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <div className="space-y-2">
          <p className="text-xs font-semibold">Besin Değerleri Referansı</p>
          <Input
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={category === null ? "default" : "outline"}
              size="sm"
              className="h-5 px-1.5 text-[10px]"
              type="button"
              onClick={() => setCategory(null)}
            >
              Tümü
            </Button>
            {categories.map(([key, label]) => (
              <Button
                key={key}
                variant={category === key ? "default" : "outline"}
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                type="button"
                onClick={() => setCategory(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {filtered.map((food, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{food.name}</p>
                  <div className="flex gap-1.5 text-[10px] text-muted-foreground">
                    <span>{food.portion}</span>
                    <span>{food.calories}kcal</span>
                    <Badge variant="outline" className="h-3.5 px-1 text-[9px]">P:{food.protein}</Badge>
                    <Badge variant="outline" className="h-3.5 px-1 text-[9px]">K:{food.carbs}</Badge>
                    <Badge variant="outline" className="h-3.5 px-1 text-[9px]">Y:{food.fat}</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  type="button"
                  onClick={() => onAdd(food)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
