"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { ReminderSettingsCard } from "@/components/reminders/reminder-settings-card";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HatirlaticiPage() {
  const t = useTranslations("settings.subpages");
  return (
    <div className="animate-fade-in">
      <Header
        title={t("remindersTitle")}
        subtitle={t("remindersSubtitle")}
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
