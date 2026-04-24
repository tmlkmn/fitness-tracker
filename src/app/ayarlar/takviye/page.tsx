"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { SupplementScheduleEditor } from "@/components/settings/supplement-schedule-editor";
import { useUserProfile } from "@/hooks/use-user";
import { Pill } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TakviyePage() {
  const { data: profile } = useUserProfile();
  return (
    <div className="animate-fade-in">
      <Header
        title="Takviye Takvimi"
        subtitle="Supplement ve ilaç zamanlaması"
        icon={Pill}
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
            <SupplementScheduleEditor profile={profile} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
