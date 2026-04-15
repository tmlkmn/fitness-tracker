"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatDateStr } from "@/lib/utils";

interface MonthCalendarProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  viewYear: number;
  viewMonth: number; // 1-indexed
  onChangeMonth: (year: number, month: number) => void;
  datesWithPlans?: Set<string>;
}

const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function getMonthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1);
  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startOffset);

  const days: {
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
  }[] = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: formatDateStr(d),
      dayNum: d.getDate(),
      isCurrentMonth: d.getMonth() === month - 1,
    });
  }

  // Trim trailing row if entirely outside current month
  const lastRowStart = 35;
  const hasCurrentMonthInLastRow = days
    .slice(lastRowStart)
    .some((d) => d.isCurrentMonth);
  if (!hasCurrentMonthInLastRow) {
    days.splice(lastRowStart);
  }

  return days;
}

export function MonthCalendar({
  selectedDate,
  onSelectDate,
  viewYear,
  viewMonth,
  onChangeMonth,
  datesWithPlans,
}: MonthCalendarProps) {
  const todayStr = formatDateStr(new Date());
  const days = getCalendarDays(viewYear, viewMonth);

  const handlePrev = () => {
    if (viewMonth === 1) {
      onChangeMonth(viewYear - 1, 12);
    } else {
      onChangeMonth(viewYear, viewMonth - 1);
    }
  };

  const handleNext = () => {
    if (viewMonth === 12) {
      onChangeMonth(viewYear + 1, 1);
    } else {
      onChangeMonth(viewYear, viewMonth + 1);
    }
  };

  const handleSelectDate = (dateStr: string, isCurrentMonth: boolean) => {
    onSelectDate(dateStr);
    if (!isCurrentMonth) {
      const d = new Date(dateStr + "T00:00:00");
      onChangeMonth(d.getFullYear(), d.getMonth() + 1);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Önceki ay"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize">
          {getMonthLabel(viewYear, viewMonth)}
        </span>
        <button
          onClick={handleNext}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Sonraki ay"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-[10px] font-medium uppercase text-muted-foreground text-center py-1"
          >
            {label}
          </div>
        ))}

        {days.map(({ dateStr, dayNum, isCurrentMonth }) => {
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const hasPlan = datesWithPlans?.has(dateStr) ?? false;

          return (
            <button
              key={dateStr}
              onClick={() => handleSelectDate(dateStr, isCurrentMonth)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg transition-all min-h-[2.5rem] text-sm",
                !isCurrentMonth && "text-muted-foreground/30",
                isSelected
                  ? "bg-primary text-primary-foreground font-bold"
                  : isToday
                    ? "bg-primary/15 text-primary font-bold"
                    : isCurrentMonth
                      ? "hover:bg-accent"
                      : "hover:bg-accent/50"
              )}
            >
              {dayNum}
              {hasPlan && !isSelected && !isToday && isCurrentMonth && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
