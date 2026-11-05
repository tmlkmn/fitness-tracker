"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { DataPrivacyCard } from "@/components/settings/data-privacy-card";
import { Database } from "lucide-react";
import { useTranslations } from "next-intl";

export default function VerilerimPage() {
  const t = useTranslations("account");
  return (
    <div className="animate-fade-in">
      <Header
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        icon={Database}
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
        <DataPrivacyCard />
      </div>
    </div>
  );
}
