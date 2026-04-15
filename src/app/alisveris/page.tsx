"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useAllWeeks } from "@/hooks/use-plans";
import { useShoppingList, useToggleShopping } from "@/hooks/use-shopping";
import { ShoppingCategory } from "@/components/shopping/shopping-category";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShoppingCart, CheckCircle } from "lucide-react";

function formatWeekLabel(startDate: string | null, weekNumber: number): string {
  if (!startDate) return `Hf ${weekNumber}`;
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString("tr-TR", { month: "short" });
  const endMonth = end.toLocaleDateString("tr-TR", { month: "short" });
  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

function findCurrentWeekId(
  weeks: { id: number; startDate: string | null }[]
): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const w of weeks) {
    if (!w.startDate) continue;
    const start = new Date(w.startDate + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    if (today >= start && today <= end) return w.id;
  }
  return null;
}

export default function AlisverisPage() {
  const { data: weeks, isLoading: weeksLoading } = useAllWeeks();

  const defaultWeekId = useMemo(() => {
    if (!weeks || weeks.length === 0) return 0;
    return findCurrentWeekId(weeks) ?? weeks[0].id;
  }, [weeks]);

  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const activeWeekId = selectedWeekId ?? defaultWeekId;

  const { data: items, isLoading: itemsLoading } = useShoppingList(activeWeekId);
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
  const percent =
    totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;

  const isLoading = weeksLoading || itemsLoading;

  return (
    <div className="animate-fade-in">
      <Header
        title="Alışveriş Listesi"
        subtitle="Haftalık market listesi"
        icon={ShoppingCart}
        rightSlot={<NotificationBell />}
      />
      <div className="p-4 space-y-4">
        {weeks && weeks.length > 0 && (
          <Tabs
            value={String(activeWeekId)}
            onValueChange={(v) => setSelectedWeekId(Number(v))}
          >
            <TabsList
              className={`grid w-full`}
              style={{
                gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
              }}
            >
              {weeks.map((week) => (
                <TabsTrigger
                  key={week.id}
                  value={String(week.id)}
                  className="text-xs px-1"
                >
                  {formatWeekLabel(week.startDate, week.weekNumber)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {totalItems > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {purchasedItems}/{totalItems} ürün
              </span>
              <Badge
                variant={purchasedItems === totalItems ? "default" : "secondary"}
                className="gap-1"
              >
                {purchasedItems === totalItems ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Tamamlandı
                  </>
                ) : (
                  `%${percent}`
                )}
              </Badge>
            </div>
            <Progress value={percent} />
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
            <p className="text-sm">
              Bu hafta için alışveriş listesi henüz hazır değil.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
