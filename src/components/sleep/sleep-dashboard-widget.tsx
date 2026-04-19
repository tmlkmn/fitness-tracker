"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Moon } from "lucide-react";
import { useLatestSleep } from "@/hooks/use-sleep";

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}dk`;
  if (m === 0) return `${h}sa`;
  return `${h}sa ${m}dk`;
}

export function SleepDashboardWidget() {
  const { data: log } = useLatestSleep();

  const duration = log?.durationMinutes;
  const quality = log?.quality;

  return (
    <Card>
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
          <p className="text-sm text-muted-foreground">Kayıt yok</p>
        )}
      </CardContent>
    </Card>
  );
}
