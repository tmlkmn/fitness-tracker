"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { HealthProfileCard } from "@/components/settings/health-profile-card";
import { ShieldCheck } from "lucide-react";

export default function HealthProfilePage() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Sağlık Profili"
        subtitle="Cinsiyet, aktivite, sağlık durumları"
        icon={ShieldCheck}
        showBack
        backHref="/ayarlar"
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      <div className="p-4">
        <HealthProfileCard />
      </div>
    </div>
  );
}
