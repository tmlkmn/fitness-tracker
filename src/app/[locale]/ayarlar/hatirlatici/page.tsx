"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { ReminderSettingsCard } from "@/components/reminders/reminder-settings-card";
import { Clock } from "lucide-react";

export default function HatirlaticiPage() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Hatırlatıcılar"
        subtitle="Öğün, antrenman ve özel hatırlatmalar"
        icon={Clock}
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
        <ReminderSettingsCard />
      </div>
    </div>
  );
}
