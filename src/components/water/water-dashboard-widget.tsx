"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Droplets, Plus, Minus } from "lucide-react";
import { useTodayWater, useIncrementWater } from "@/hooks/use-water";

export function WaterDashboardWidget() {
  const { data: log } = useTodayWater();
  const increment = useIncrementWater();

  const [todayStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const glasses = log?.glasses ?? 0;
  const target = log?.targetGlasses ?? 8;
  const pct = target > 0 ? Math.min(100, Math.round((glasses / target) * 100)) : 0;

  const handleIncrement = (delta: number) => {
    if (increment.isPending) return;
    increment.mutate({ dateStr: todayStr, delta });
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Droplets className="h-4 w-4 text-blue-400" />
          <span className="text-xs text-muted-foreground">Su</span>
        </div>

        <div className="flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => handleIncrement(-1)}
            disabled={glasses <= 0}
            className="h-7 w-7 rounded-full border border-input flex items-center justify-center shrink-0 hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>

          <p className="text-lg font-bold tabular-nums text-center">
            {glasses}<span className="text-xs font-normal text-muted-foreground">/{target}</span>
          </p>

          <button
            type="button"
            onClick={() => handleIncrement(1)}
            className="h-7 w-7 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 hover:bg-blue-500/25 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

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
