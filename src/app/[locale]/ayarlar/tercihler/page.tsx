"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { UnitPreferencesCard } from "@/components/settings/unit-preferences-card";
import { DashboardPrefsCard } from "@/components/settings/dashboard-prefs-card";
import { Sliders } from "lucide-react";

export default function TercihlerPage() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Tercihler"
        subtitle="Birim ve panel ayarları"
        icon={Sliders}
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
        <UnitPreferencesCard />
        <DashboardPrefsCard />
      </div>
    </div>
  );
}
