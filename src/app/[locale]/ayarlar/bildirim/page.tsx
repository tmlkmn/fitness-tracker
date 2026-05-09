"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { NotificationPreferencesCard } from "@/components/notifications/notification-preferences-card";
import { Bell } from "lucide-react";

export default function BildirimPage() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Bildirim Ayarları"
        subtitle="Push, e-posta ve sessiz saatler"
        icon={Bell}
        showBack
        backHref="/ayarlar"
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      <div className="p-4 space-y-4">
        <NotificationPreferencesCard />
      </div>
    </div>
  );
}
