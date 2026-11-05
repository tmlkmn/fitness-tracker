"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useUnreadCount, useMarkAllAsRead } from "@/hooks/use-notifications";
import { NotificationDropdown } from "./notification-dropdown";

export function NotificationBell() {
  const { data } = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();
  const [open, setOpen] = useState(false);
  const count = data?.count ?? 0;

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && count > 0) {
      markAllAsRead.mutate();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-accent transition-colors"
          aria-label="Bildirimler"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-88 max-w-[calc(100vw-1rem)] p-0 overflow-hidden"
      >
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  );
}
