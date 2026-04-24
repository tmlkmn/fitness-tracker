"use client";

import { useMemo, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import {
  useNotifications,
  useClearAllNotifications,
} from "@/hooks/use-notifications";
import { NotificationItem } from "./notification-item";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  getNotificationConfig,
  type NotificationCategory,
} from "./notification-types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type Filter = "all" | NotificationCategory;

export function NotificationDropdown() {
  const { data: notifications, isLoading } = useNotifications();
  const clearAll = useClearAllNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const map: Record<NotificationCategory, number> = {
      reminder: 0,
      share: 0,
      membership: 0,
      feedback: 0,
      other: 0,
    };
    for (const n of notifications ?? []) {
      map[getNotificationConfig(n.type).category]++;
    }
    return map;
  }, [notifications]);

  const presentCategories = CATEGORY_ORDER.filter((c) => counts[c] > 0);

  const filtered = useMemo(() => {
    if (!notifications) return [];
    if (filter === "all") return notifications;
    return notifications.filter(
      (n) => getNotificationConfig(n.type).category === filter,
    );
  }, [notifications, filter]);

  const total = notifications?.length ?? 0;
  const hasNotifications = total > 0;
  const showFilters = presentCategories.length >= 2;

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold">Bildirimler</h3>
          {hasNotifications && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {total}
            </span>
          )}
        </div>
        {hasNotifications && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => clearAll.mutate()}
            disabled={clearAll.isPending}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Temizle
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="px-2 py-2 border-b border-border flex gap-1 overflow-x-auto scrollbar-none">
          <FilterChip
            label="Tümü"
            count={total}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {presentCategories.map((c) => (
            <FilterChip
              key={c}
              label={CATEGORY_LABELS[c]}
              count={counts[c]}
              active={filter === c}
              onClick={() => setFilter(c)}
            />
          ))}
        </div>
      )}

      <div className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !hasNotifications ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-2">
              <Bell className="h-5 w-5 opacity-50" />
            </div>
            <p className="text-sm">Bildirim bulunmuyor</p>
            <p className="text-[11px] mt-0.5 opacity-70">
              Yeni bildirimler burada görünecek
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Bu kategoride bildirim yok</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted/60 text-muted-foreground hover:bg-muted"
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-[10px] px-1 rounded ${
          active
            ? "bg-primary-foreground/20"
            : "bg-background/60"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
