"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface ShoppingItemProps {
  id: number;
  itemName: string;
  quantity: string;
  notes?: string | null;
  isPurchased: boolean;
  onToggle: (id: number, isPurchased: boolean) => void;
}

export function ShoppingItem({
  id,
  itemName,
  quantity,
  notes,
  isPurchased,
  onToggle,
}: ShoppingItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox
        checked={isPurchased}
        onCheckedChange={(checked) => onToggle(id, !!checked)}
      />
      <div className="flex-1">
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
      <span className="text-xs text-muted-foreground">{quantity}</span>
    </div>
  );
}
