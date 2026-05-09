"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { ShareManager } from "@/components/sharing/share-manager";
import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";

export default function PaylasimPage() {
  const t = useTranslations("settings.subpages");
  return (
    <div className="animate-fade-in">
      <Header
        title={t("sharingTitle")}
        subtitle={t("sharingSubtitle")}
        icon={Share2}
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
        <ShareManager />
      </div>
    </div>
  );
}
