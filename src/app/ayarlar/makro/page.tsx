"use client";

import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { MacroTargetsCard } from "@/components/meals/macro-targets-card";
import { AIMacroCalculator } from "@/components/meals/ai-macro-calculator";
import { Target } from "lucide-react";

export default function MakroPage() {
  return (
    <div className="animate-fade-in">
      <Header
        title="Makro Hedefleri"
        subtitle="Kalori ve makro dağılımı"
        icon={Target}
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
        <AIMacroCalculator />
        <MacroTargetsCard />
      </div>
    </div>
  );
}
