"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";
import { DASHBOARD_CARDS } from "@/lib/dashboard-prefs";
import { useDashboardPrefs } from "@/hooks/use-dashboard-prefs";
import { cn } from "@/lib/utils";

export function DashboardPrefsCard() {
  const { toggle, isVisible, hydrated } = useDashboardPrefs();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          Dashboard Kartları
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        <p className="text-xs text-muted-foreground pb-2">
          Ana sayfada görmek istediğin kartları seç. Tercihler bu cihazda saklanır.
        </p>
        {DASHBOARD_CARDS.map((card) => {
          const visible = hydrated ? isVisible(card.key) : true;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => toggle(card.key)}
              className="w-full flex items-start gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors text-left"
            >
              <div
                className={cn(
                  "mt-0.5 h-5 w-9 rounded-full transition-colors shrink-0 relative",
                  visible ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                    visible ? "left-[18px]" : "left-0.5",
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{card.label}</p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
