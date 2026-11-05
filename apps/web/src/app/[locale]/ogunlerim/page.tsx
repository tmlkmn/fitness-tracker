"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { MealLibrary } from "@/components/meals/meal-library";
import { useTranslations } from "next-intl";

export default function OgunlerimPage() {
  const t = useTranslations("meals.library");
  return (
    <div className="animate-fade-in">
      <Header
        title={t("title")}
        subtitle={t("subtitle")}
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
