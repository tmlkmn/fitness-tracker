"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useDeleteNotification } from "@/hooks/use-notifications";
import { getNotificationConfig } from "./notification-types";

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

interface NotificationItemProps {
  notification: {
    id: number;
    type: string;
    title: string;
    body: string;
    link: string | null;
    isRead: boolean | null;
    createdAt: Date | null;
  };
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const deleteMutation = useDeleteNotification();
  const config = getNotificationConfig(notification.type);
  const Icon = config.icon;
  const isUnread = !notification.isRead;

  const handleClick = () => {
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div
      className={`group relative flex gap-3 px-3 py-2.5 border-l-2 transition-colors ${
        notification.link ? "cursor-pointer hover:bg-accent/40" : ""
      } ${isUnread ? `${config.accentBorder} bg-accent/20` : "border-l-transparent"}`}
      onClick={handleClick}
    >
      <div
        className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${config.iconBg}`}
      >
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-tight wrap-break-word ${
              isUnread ? "font-semibold" : "font-medium"
            }`}
          >
            {notification.title}
          </p>
          {isUnread && (
            <span className="shrink-0 mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 wrap-break-word">
          {notification.body}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {notification.createdAt
            ? timeAgo(new Date(notification.createdAt))
            : ""}
        </p>
      </div>
      <button
        className="shrink-0 h-6 w-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive transition-all self-start"
        onClick={(e) => {
          e.stopPropagation();
          deleteMutation.mutate(notification.id);
        }}
        aria-label="Bildirimi sil"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
