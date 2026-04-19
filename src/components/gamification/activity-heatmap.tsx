"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { useMemo, useRef } from "react";
import type { ActivityStats } from "@/actions/activity-stats";

interface ActivityHeatmapProps {
  completionMap: ActivityStats["completionMap"];
}

const DAY_LABELS = ["Pzt", "", "Çar", "", "Cum", "", "Paz"];

const MONTH_LABELS = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

function getStatusColor(status: "full" | "partial" | "none" | "empty") {
  switch (status) {
    case "full":
      return "bg-green-500";
    case "partial":
      return "bg-green-700/50";
    case "none":
      return "bg-muted/40";
    case "empty":
      return "bg-muted/20";
  }
}

function getStatusLabel(status: "full" | "partial" | "none" | "empty") {
  switch (status) {
    case "full":
      return "Tam tamamlandı";
    case "partial":
      return "Kısmen tamamlandı";
    case "none":
      return "Tamamlanmadı";
    case "empty":
      return "Plan yok";
  }
}

function formatDateTurkish(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

interface DayCell {
  date: string;
  status: "full" | "partial" | "none" | "empty";
  weekIndex: number;
  dayOfWeek: number; // 0=Mon, 6=Sun
}

export function ActivityHeatmap({ completionMap }: ActivityHeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { cells, monthMarkers, totalWeeks, fullCount, partialCount } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Go back 364 days (365 days total including today)
    const start = new Date(today);
    start.setDate(start.getDate() - 364);

    // Adjust start to Monday
    const startDow = start.getDay(); // 0=Sun
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
    start.setDate(start.getDate() + mondayOffset);

    const cells: DayCell[] = [];
    const monthMarkers: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(start);
    let weekIndex = 0;
    let dayOfWeek = 0;

    while (cursor <= today) {
      const dateStr = cursor.toISOString().split("T")[0];
      const month = cursor.getMonth();

      // Track month changes for labels
      if (month !== lastMonth && dayOfWeek === 0) {
        monthMarkers.push({ label: MONTH_LABELS[month], weekIndex });
        lastMonth = month;
      }

      const isFuture = cursor > today;
      const status = isFuture
        ? "empty"
        : completionMap[dateStr] ?? "empty";

      cells.push({ date: dateStr, status, weekIndex, dayOfWeek });

      // Advance
      cursor.setDate(cursor.getDate() + 1);
      dayOfWeek++;
      if (dayOfWeek > 6) {
        dayOfWeek = 0;
        weekIndex++;
      }
    }

    const totalWeeks = weekIndex + (dayOfWeek > 0 ? 1 : 0);
    let fullCount = 0;
    let partialCount = 0;
    for (const c of cells) {
      if (c.status === "full") fullCount++;
      else if (c.status === "partial") partialCount++;
    }

    return { cells, monthMarkers, totalWeeks, fullCount, partialCount };
  }, [completionMap]);

  // Scroll to end on mount
  const scrollRefCallback = (node: HTMLDivElement | null) => {
    if (node) {
      node.scrollLeft = node.scrollWidth;
      scrollRef.current = node;
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Aktivite Haritası</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Son 365 gün
          </span>
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto pb-1 scrollbar-hide" ref={scrollRefCallback}>
          <div className="inline-flex gap-0">
            {/* Day labels column */}
            <div className="flex flex-col gap-[2px] mr-1 pt-[18px]">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="h-[10px] flex items-center"
                >
                  <span className="text-[9px] text-muted-foreground w-6 text-right">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div>
              {/* Month labels */}
              <div className="flex gap-[2px] mb-[2px]" style={{ height: 14 }}>
                {Array.from({ length: totalWeeks }).map((_, wi) => {
                  const marker = monthMarkers.find((m) => m.weekIndex === wi);
                  return (
                    <div key={wi} className="w-[10px] flex-shrink-0">
                      {marker && (
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                          {marker.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Cell grid: 7 rows */}
              <TooltipProvider delayDuration={0}>
                <div className="flex gap-[2px]">
                  {Array.from({ length: totalWeeks }).map((_, wi) => (
                    <div key={wi} className="flex flex-col gap-[2px]">
                      {Array.from({ length: 7 }).map((_, di) => {
                        const cell = cells.find(
                          (c) => c.weekIndex === wi && c.dayOfWeek === di,
                        );
                        if (!cell) {
                          return (
                            <div
                              key={di}
                              className="w-[10px] h-[10px] rounded-[2px] bg-transparent"
                            />
                          );
                        }
                        return (
                          <Tooltip key={di}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "w-[10px] h-[10px] rounded-[2px] transition-colors",
                                  getStatusColor(cell.status),
                                )}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-medium">
                                {formatDateTurkish(cell.date)}
                              </p>
                              <p className="text-muted-foreground">
                                {getStatusLabel(cell.status)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Summary + Legend */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {fullCount} tam, {partialCount} kısmi tamamlandı
          </p>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">Az</span>
            <div className="w-[10px] h-[10px] rounded-[2px] bg-muted/20" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-muted/40" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-green-700/50" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-green-500" />
            <span className="text-[9px] text-muted-foreground">Çok</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
