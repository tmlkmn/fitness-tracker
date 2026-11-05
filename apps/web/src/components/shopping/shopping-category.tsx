"use client";

import { ShoppingItem } from "./shopping-item";
import { Separator } from "@/components/ui/separator";
import { stripEmoji } from "@/lib/icon-map";

interface Item {
  id: number;
  itemName: string;
  quantity: string;
  notes?: string | null;
  isPurchased: boolean | null;
  mealIds?: number[] | null;
}

interface ShoppingCategoryProps {
  category: string;
  items: Item[];
  onToggle?: (id: number, isPurchased: boolean) => void;
  readOnly?: boolean;
}

export function ShoppingCategory({
  category,
  items,
  onToggle,
  readOnly,
}: ShoppingCategoryProps) {
  const purchasedCount = items.filter((i) => i.isPurchased).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-primary">
          {stripEmoji(category)}
        </h3>
        <span className="text-xs text-muted-foreground">
          {purchasedCount}/{items.length}
        </span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <ShoppingItem
            key={item.id}
            {...item}
            isPurchased={item.isPurchased ?? false}
            onToggle={onToggle}
            readOnly={readOnly}
          />
        ))}
      </div>
      <Separator className="mt-2" />
    </div>
  );
}
