"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, Minus, Plus } from "lucide-react";
import {
  useWaterLog,
  useIncrementWater,
  useDailyWaterTarget,
} from "@/hooks/use-water";

interface WaterTrackerProps {
  date: string;
  readOnly?: boolean;
}

export function WaterTracker({ date, readOnly }: WaterTrackerProps) {
  const { data: log } = useWaterLog(date);
  const { data: personalizedTarget } = useDailyWaterTarget(date);
  const increment = useIncrementWater();

  const glasses = log?.glasses ?? 0;
  // Prefer the persisted target on the row; fall back to the personalized
  // target computed from profile (weight + plan type + goal). Last-resort
  // 8 only if both are absent.
  const target = log?.targetGlasses ?? personalizedTarget ?? 8;
  const liters = (glasses * 0.25).toFixed(2).replace(/\.?0+$/, "");
  const targetLiters = (target * 0.25).toFixed(1).replace(/\.?0+$/, "");
  const pct = target > 0 ? Math.min(100, Math.round((glasses / target) * 100)) : 0;

  const handleIncrement = (delta: number) => {
    if (readOnly || increment.isPending) return;
    increment.mutate({ dateStr: date, delta });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold">Su Takibi</h3>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Decrement button */}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            onClick={() => handleIncrement(-1)}
            disabled={readOnly || glasses <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>

          {/* Center display */}
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold tabular-nums">
              {glasses}
              <span className="text-base font-normal text-muted-foreground"> / {target}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {liters} / {targetLiters} L
            </p>
          </div>

          {/* Increment button */}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            onClick={() => handleIncrement(1)}
            disabled={readOnly}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground text-right mt-1">%{pct}</p>
      </CardContent>
    </Card>
  );
}
