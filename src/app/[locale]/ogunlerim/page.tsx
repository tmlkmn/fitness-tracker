"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { MealLibrary } from "@/components/meals/meal-library";

export default function OgunlerimPage() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Öğün Kütüphanem"
        subtitle="Kayıtlı öğünler ve günlük planlar"
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
        <MealLibrary />
      </div>
    </div>
  );
}
