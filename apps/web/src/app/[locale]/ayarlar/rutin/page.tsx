"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { DailyRoutineEditor } from "@/components/settings/daily-routine-editor";
import { useUserProfile } from "@/hooks/use-user";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export default function RutinPage() {
  const { data: profile } = useUserProfile();
  const t = useTranslations("settings.subpages");
  return (
    <div className="animate-fade-in">
      <Header
        title={t("routineTitle")}
        subtitle={t("routineSubtitle")}
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
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <DailyRoutineEditor profile={profile} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
