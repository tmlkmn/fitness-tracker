"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Moon, Plus } from "lucide-react";
import Link from "next/link";
import { useSleepByDate } from "@/hooks/use-sleep";
import { useTodayDashboard } from "@/hooks/use-plans";
import { getTurkeyTodayStr } from "@/lib/utils";
import { useState } from "react";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}sa`;
  return `${h}sa ${m}dk`;
}

export function SleepDashboardWidget() {
  const [todayStr] = useState(() => getTurkeyTodayStr());
  const { data: log } = useSleepByDate(todayStr);
  const { data: today } = useTodayDashboard();

  const duration = log?.durationMinutes;
  const quality = log?.quality;

  const href = today?.dailyPlan
    ? `/gun/${today.dailyPlan.id}?focus=sleep#uyku`
    : "/takvim";

  return (
    <Link href={href} className="block h-full">
      <Card className="h-full hover:bg-accent/50 active:scale-[0.98] transition-all cursor-pointer">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Moon className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-muted-foreground">Uyku</span>
          </div>
          {duration ? (
            <>
              <p className="text-lg font-bold tabular-nums">
                {formatDuration(duration)}
              </p>
              {quality && (
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Moon
                      key={v}
                      className={`h-3 w-3 ${
                        v <= quality
                          ? "text-indigo-400 fill-indigo-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Plus className="h-3.5 w-3.5" />
              <span>Bugün için ekle</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
