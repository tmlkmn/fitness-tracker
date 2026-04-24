"use client";

import { AlertTriangle } from "lucide-react";

interface MonthGateWarningProps {
  currentMonthLabel: string;
  emptyWeekCount: number;
  compact?: boolean;
}

export function MonthGateWarning({
  currentMonthLabel,
  emptyWeekCount,
  compact,
}: MonthGateWarningProps) {
  return (
    <div
      className={`rounded-lg border border-yellow-500/30 bg-yellow-500/5 ${
        compact ? "p-2.5" : "p-3"
      } flex items-start gap-2`}
    >
      <AlertTriangle
        className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} text-yellow-500 shrink-0 mt-0.5`}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`${compact ? "text-xs" : "text-sm"} font-medium text-yellow-500`}
        >
          {currentMonthLabel} ayı tamamlanmadı
        </p>
        <p className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground mt-0.5`}>
          Sonraki ay için AI önerisi alabilmek için önce {currentMonthLabel}{" "}
          ayındaki {emptyWeekCount} haftayı planla.
        </p>
      </div>
    </div>
  );
}
