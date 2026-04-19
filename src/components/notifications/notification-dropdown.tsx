"use client";

import { Bell, Trash2 } from "lucide-react";
import { useNotifications, useClearAllNotifications } from "@/hooks/use-notifications";
import { NotificationItem } from "./notification-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function NotificationDropdown() {
  const { data: notifications, isLoading } = useNotifications();
  const clearAll = useClearAllNotifications();

  const hasNotifications = notifications && notifications.length > 0;

  return (
    <div>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bildirimler</h3>
        {hasNotifications && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => clearAll.mutate()}
            disabled={clearAll.isPending}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Tümünü temizle
          </Button>
        )}
      </div>
      <ScrollArea className="max-h-80">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : !hasNotifications ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Bildirim bulunmuyor</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
