"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useDeleteNotification } from "@/hooks/use-notifications";

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

interface NotificationItemProps {
  notification: {
    id: number;
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

  const handleClick = () => {
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div
      className={`relative flex gap-3 p-3 transition-colors ${
        notification.link ? "cursor-pointer hover:bg-accent/50" : ""
      } ${!notification.isRead ? "bg-accent/30" : ""}`}
      onClick={handleClick}
    >
      {!notification.isRead && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
      )}
      <div className="flex-1 min-w-0 pl-2">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {notification.createdAt ? timeAgo(new Date(notification.createdAt)) : ""}
        </p>
      </div>
      <button
        className="shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/20 transition-colors"
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
