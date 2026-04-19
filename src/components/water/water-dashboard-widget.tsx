"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Droplets } from "lucide-react";
import { useTodayWater } from "@/hooks/use-water";

export function WaterDashboardWidget() {
  const { data: log } = useTodayWater();

  const glasses = log?.glasses ?? 0;
  const target = log?.targetGlasses ?? 8;
  const pct = target > 0 ? Math.min(100, Math.round((glasses / target) * 100)) : 0;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Droplets className="h-4 w-4 text-blue-400" />
          <span className="text-xs text-muted-foreground">Su</span>
        </div>
        <p className="text-lg font-bold tabular-nums">
          {glasses}<span className="text-xs font-normal text-muted-foreground">/{target}</span>
          <span className="text-xs font-normal text-muted-foreground ml-1">bardak</span>
        </p>
        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
