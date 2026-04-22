"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getMealsByIds } from "@/actions/shopping";
import { Utensils } from "lucide-react";

interface ShoppingItemProps {
  id: number;
  itemName: string;
  quantity: string;
  notes?: string | null;
  isPurchased: boolean;
  mealIds?: number[] | null;
  onToggle?: (id: number, isPurchased: boolean) => void;
  readOnly?: boolean;
}

export function ShoppingItem({
  id,
  itemName,
  quantity,
  notes,
  isPurchased,
  mealIds,
  onToggle,
  readOnly,
}: ShoppingItemProps) {
  const [open, setOpen] = useState(false);
  const hasMealRefs = Array.isArray(mealIds) && mealIds.length > 0;

  const { data: linkedMeals, isLoading } = useQuery({
    queryKey: ["shopping-meal-refs", mealIds],
    queryFn: () => getMealsByIds(mealIds ?? []),
    enabled: open && hasMealRefs,
    staleTime: 60_000,
  });

  return (
    <div className="flex items-center gap-3 py-2">
      {!readOnly && (
        <Checkbox
          checked={isPurchased}
          onCheckedChange={(checked) => onToggle?.(id, !!checked)}
        />
      )}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm",
            isPurchased && "line-through text-muted-foreground"
          )}
        >
          {itemName}
        </span>
        {notes ? (
          <span className="text-xs text-muted-foreground ml-1">({notes})</span>
        ) : null}
      </div>
      {hasMealRefs && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground rounded px-1.5 py-0.5 bg-muted/50"
              aria-label={`${mealIds!.length} öğünde kullanılıyor`}
            >
              <Utensils className="h-3 w-3" />
              {mealIds!.length}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <p className="text-xs font-medium mb-2">Bu malzeme şu öğünlerde:</p>
            {isLoading ? (
              <p className="text-xs text-muted-foreground">Yükleniyor...</p>
            ) : linkedMeals && linkedMeals.length > 0 ? (
              <ul className="space-y-1">
                {linkedMeals.map((m) => (
                  <li key={m.id} className="text-xs">
                    <span className="font-medium">
                      {m.dayName} · {m.mealLabel}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Referans verilen öğünler bulunamadı.
              </p>
            )}
          </PopoverContent>
        </Popover>
      )}
      <span className="text-xs text-muted-foreground">{quantity}</span>
    </div>
  );
}
