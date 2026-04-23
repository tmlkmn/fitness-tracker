"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDateStr } from "@/lib/utils";
import { getWeekDayLabels, type WeekStart } from "@/lib/week";

interface WeekStripProps {
  weekStartDate: Date;
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  datesWithPlans?: Set<string>;
  weekStartsOn?: WeekStart;
}

function formatMonthRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startMonth = start.toLocaleDateString("tr-TR", { month: "short" });
  const endMonth = end.toLocaleDateString("tr-TR", { month: "short" });
  if (startMonth === endMonth) {
    return `${start.getDate()} - ${end.getDate()} ${startMonth} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth} ${end.getFullYear()}`;
}

export function WeekStrip({
  weekStartDate: weekStart,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  datesWithPlans,
  weekStartsOn = "monday",
}: WeekStripProps) {
  const todayStr = formatDateStr(new Date());
  const labels = getWeekDayLabels(weekStartsOn);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return {
      dateStr: formatDateStr(d),
      dayNum: d.getDate(),
      label: labels[i],
    };
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevWeek}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Önceki hafta"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {formatMonthRange(weekStart)}
        </span>
        <button
          onClick={onNextWeek}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Sonraki hafta"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ dateStr, dayNum, label }) => {
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const hasPlan = datesWithPlans?.has(dateStr) ?? false;
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={cn(
                "relative flex flex-col items-center py-2 rounded-xl transition-all text-center",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                    ? "bg-primary/15 text-primary"
                    : "hover:bg-accent"
              )}
            >
              <span className="text-[10px] font-medium uppercase opacity-70">
                {label}
              </span>
              <span className={cn("text-lg font-bold", isToday && !isSelected && "text-primary")}>
                {dayNum}
              </span>
              {hasPlan && !isSelected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
