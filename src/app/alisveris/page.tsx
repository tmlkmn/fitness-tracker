"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useShoppingList, useToggleShopping } from "@/hooks/use-shopping";
import { useWeeklyPlan } from "@/hooks/use-plans";
import { ShoppingCategory } from "@/components/shopping/shopping-category";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";

export default function AlisverisPage() {
  const [weekNumber, setWeekNumber] = useState(1);
  const { data: weeklyPlan } = useWeeklyPlan(weekNumber);
  const { data: items, isLoading } = useShoppingList(weeklyPlan?.id ?? 0);
  const toggleItem = useToggleShopping();

  const categories = items
    ? items.reduce(
        (acc, item) => {
          if (!acc[item.category]) acc[item.category] = [];
          acc[item.category].push(item);
          return acc;
        },
        {} as Record<string, typeof items>
      )
    : {};

  const totalItems = items?.length ?? 0;
  const purchasedItems = items?.filter((i) => i.isPurchased).length ?? 0;

  return (
    <div>
      <Header title="Alışveriş Listesi" subtitle="Haftalık market listesi" />
      <div className="p-4 space-y-4">
        <Tabs
          value={String(weekNumber)}
          onValueChange={(v) => setWeekNumber(Number(v))}
        >
          <TabsList className="grid grid-cols-4 w-full">
            {[1, 2, 3, 4].map((week) => (
              <TabsTrigger key={week} value={String(week)}>
                Hf {week}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {totalItems > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {purchasedItems}/{totalItems} ürün
            </span>
            <Badge
              variant={purchasedItems === totalItems ? "default" : "secondary"}
            >
              {purchasedItems === totalItems
                ? "✅ Tamamlandı"
                : `%${Math.round((purchasedItems / totalItems) * 100)}`}
            </Badge>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : Object.keys(categories).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(categories).map(([category, categoryItems]) => (
              <ShoppingCategory
                key={category}
                category={category}
                items={categoryItems}
                onToggle={(id, purchased) =>
                  toggleItem.mutate({ id, isPurchased: purchased })
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Alışveriş listesi bulunamadı.</p>
            <p className="text-xs mt-1 font-mono">npm run db:seed çalıştırın</p>
          </div>
        )}
      </div>
    </div>
  );
}
