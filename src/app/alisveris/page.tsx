"use client";

import { useState, useMemo, Suspense } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { useAllWeeks } from "@/hooks/use-plans";
import { useShoppingList, useToggleShopping, useGenerateShoppingList } from "@/hooks/use-shopping";
import { ShoppingCategory } from "@/components/shopping/shopping-category";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShoppingCart, CheckCircle, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

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

function AlisverisContent() {
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const { data: weeks, isLoading: weeksLoading } = useAllWeeks();

  const defaultWeekId = useMemo(() => {
    if (weekParam) return Number(weekParam);
    if (!weeks || weeks.length === 0) return 0;
    return findCurrentWeekId(weeks) ?? weeks[0].id;
  }, [weeks, weekParam]);

  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const activeWeekId = selectedWeekId ?? defaultWeekId;

  const { data: items, isLoading: itemsLoading } = useShoppingList(activeWeekId);
  const toggleItem = useToggleShopping();
  const generateShopping = useGenerateShoppingList();
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [error, setError] = useState("");

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
  const hasItems = totalItems > 0;

  const handleGenerate = async () => {
    if (!activeWeekId) return;
    setError("");
    generateShopping.mutate(activeWeekId, {
      onError: (err) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "RATE_LIMITED") {
          setError("Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.");
        } else if (msg.startsWith("COOLDOWN:")) {
          const secs = msg.split(":")[1];
          setError(`Lütfen ${secs} saniye bekleyin.`);
        } else if (msg === "NO_MEALS") {
          setError("Bu haftada öğün bulunamadı. Önce beslenme programı oluşturun.");
        } else {
          setError("AI özelliği şu anda kullanılamıyor. Daha sonra tekrar deneyin.");
        }
      },
    });
  };

  const handleRefresh = () => {
    setRefreshConfirmOpen(true);
  };

  const confirmRefresh = () => {
    setRefreshConfirmOpen(false);
    handleGenerate();
  };

  return (
    <div className="animate-fade-in">
      <Header
        title="Alışveriş Listesi"
        subtitle="Haftalık market listesi"
        icon={ShoppingCart}
        rightSlot={
          <div className="flex items-center gap-1">
            <FeedbackButton />
            <NotificationBell />
          </div>
        }
      />
      <div className="p-4 space-y-4">
        {weeks && weeks.length > 0 && (
          <Tabs
            value={String(activeWeekId)}
            onValueChange={(v) => {
              setSelectedWeekId(Number(v));
              setError("");
            }}
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

        {hasItems && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {purchasedItems}/{totalItems} ürün
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-7 text-xs"
                  onClick={handleRefresh}
                  disabled={generateShopping.isPending}
                >
                  {generateShopping.isPending ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Yenile
                </Button>
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
            </div>
            <Progress value={percent} />
          </div>
        )}

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : hasItems ? (
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
        ) : generateShopping.isPending ? (
          <div className="text-center py-8 space-y-3">
            <RefreshCw className="h-10 w-10 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Alışveriş listesi oluşturuluyor...
            </p>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">
              Bu hafta için alışveriş listesi henüz hazır değil.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generateShopping.isPending || !activeWeekId}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              AI ile Alışveriş Listesi Oluştur
            </Button>
          </div>
        )}
      </div>

      {/* Refresh confirmation dialog */}
      <Dialog open={refreshConfirmOpen} onOpenChange={setRefreshConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alışveriş Listesini Yenile</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mevcut alışveriş listesi silinip beslenme programına göre yeniden oluşturulacak. Devam etmek istiyor musunuz?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRefreshConfirmOpen(false)}>
              İptal
            </Button>
            <Button onClick={confirmRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AlisverisPage() {
  return (
    <Suspense fallback={
      <div className="animate-fade-in">
        <Header
          title="Alışveriş Listesi"
          subtitle="Haftalık market listesi"
          icon={ShoppingCart}
        />
        <div className="p-4 space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    }>
      <AlisverisContent />
    </Suspense>
  );
}
