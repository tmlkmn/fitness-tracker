"use client";

import { useState, useMemo, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { WeekStrip } from "@/components/calendar/week-strip";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { DayDetailPanel } from "@/components/calendar/day-detail-panel";
import { AiWeeklyPlanModal } from "@/components/calendar/ai-weekly-plan-modal";
import { ProfileMissingWarning } from "@/components/ai/profile-missing-warning";
import { useProfileCheck } from "@/hooks/use-profile-check";
import { useWeekPlansByDate, useDatesWithPlans } from "@/hooks/use-plans";
import { useGenerateWeeklyPlan, useApplyWeeklyPlan } from "@/hooks/use-weekly-ai";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dumbbell,
  Calendar,
  CalendarDays,
  ChevronUp,
  CircleDot,
  Sparkles,
  Plus,
} from "lucide-react";
import { formatDateStr } from "@/lib/utils";
import { ensureDailyPlan } from "@/actions/ensure-plan";
import { useQueryClient } from "@tanstack/react-query";

function formatTurkishDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function TakvimPage() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => formatDateStr(today));
  const [weekStart, setWeekStart] = useState(() => getMonday(today));
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [viewYear, setViewYear] = useState(() => today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => today.getMonth() + 1);
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [profileWarningOpen, setProfileWarningOpen] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [createdDailyPlanId, setCreatedDailyPlanId] = useState<number | null>(null);

  const { data, isLoading } = useWeekPlansByDate(selectedDate);
  const { data: planDates } = useDatesWithPlans(viewYear, viewMonth);
  const queryClient = useQueryClient();

  const generateWeekly = useGenerateWeeklyPlan();
  const applyWeekly = useApplyWeeklyPlan();
  const { missingFields } = useProfileCheck();

  // Also fetch plan dates for the week strip's month (may differ from viewMonth)
  const weekMonth = weekStart.getMonth() + 1;
  const weekYear = weekStart.getFullYear();
  const { data: weekPlanDates } = useDatesWithPlans(weekYear, weekMonth);

  const datesWithPlans = useMemo(() => {
    const set = new Set(planDates ?? []);
    if (weekPlanDates) {
      for (const d of weekPlanDates) set.add(d);
    }
    return set;
  }, [planDates, weekPlanDates]);

  const selectedDayPlan = data?.dailyPlans.find(
    (d) => d.date === selectedDate
  );

  const handlePrevWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }, []);

  const handleNextWeek = useCallback(() => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }, []);

  const handleSelectDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setCreatedDailyPlanId(null);
    const d = new Date(dateStr + "T00:00:00");
    setWeekStart(getMonday(d));
  }, []);

  const handleMonthSelectDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setCreatedDailyPlanId(null);
    const d = new Date(dateStr + "T00:00:00");
    setWeekStart(getMonday(d));
    setShowFullCalendar(false);
  }, []);

  const todayStr = useMemo(() => formatDateStr(today), [today]);
  const isToday = selectedDate === todayStr;

  const handleGoToToday = useCallback(() => {
    const now = new Date();
    const todayDate = formatDateStr(now);
    setSelectedDate(todayDate);
    setCreatedDailyPlanId(null);
    setWeekStart(getMonday(now));
    setShowFullCalendar(false);
  }, []);

  // AI Weekly Plan handlers
  const handleGenerateWeekly = (userNote?: string) => {
    generateWeekly.mutate({ dateStr: selectedDate, userNote });
  };

  const handleApplyWeekly = () => {
    if (!generateWeekly.data?.suggestedPlan) return;
    applyWeekly.mutate(
      { dateStr: selectedDate, plan: generateWeekly.data.suggestedPlan },
      {
        onSuccess: () => {
          setWeeklyModalOpen(false);
          generateWeekly.reset();
        },
      },
    );
  };

  const handleApplySaved = (plan: import("@/actions/ai-weekly").AIWeeklyPlan) => {
    applyWeekly.mutate(
      { dateStr: selectedDate, plan },
      {
        onSuccess: () => {
          setWeeklyModalOpen(false);
          generateWeekly.reset();
        },
      },
    );
  };

  const handleWeeklyModalOpenChange = (open: boolean) => {
    if (open && missingFields.length > 0) {
      setProfileWarningOpen(true);
      return;
    }
    setWeeklyModalOpen(open);
    if (!open) {
      generateWeekly.reset();
    }
  };

  const weeklyError = generateWeekly.error
    ? generateWeekly.error.message === "RATE_LIMITED"
      ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
      : "AI özelliği şu anda kullanılamıyor. Daha sonra tekrar deneyin."
    : null;

  // Create a plan on demand for empty days
  const handleCreatePlanForDate = async () => {
    setCreatingPlan(true);
    try {
      const dailyPlanId = await ensureDailyPlan(selectedDate);
      setCreatedDailyPlanId(dailyPlanId);
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    } catch {
      // Error creating plan
    } finally {
      setCreatingPlan(false);
    }
  };

  // Determine the dailyPlanId to use for the detail panel
  const activeDailyPlanId = selectedDayPlan?.id ?? createdDailyPlanId;

  return (
    <div className="animate-fade-in">
      <Header
        title="Takvim"
        subtitle="Antrenman & Beslenme Programı"
        icon={Calendar}
        rightSlot={
          <div className="flex items-center gap-1">
            <FeedbackButton />
            <NotificationBell />
          </div>
        }
      />
      <div className="p-4 space-y-4">
        {showFullCalendar ? (
          <>
            <MonthCalendar
              selectedDate={selectedDate}
              onSelectDate={handleMonthSelectDate}
              viewYear={viewYear}
              viewMonth={viewMonth}
              onChangeMonth={(y, m) => {
                setViewYear(y);
                setViewMonth(m);
              }}
              datesWithPlans={datesWithPlans}
            />
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-1.5 text-muted-foreground"
              onClick={() => setShowFullCalendar(false)}
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Haftalık Görünüm
            </Button>
            {!isToday && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-muted-foreground"
                onClick={handleGoToToday}
              >
                <CircleDot className="h-3.5 w-3.5" />
                Bugün
              </Button>
            )}
          </>
        ) : (
          <>
            <WeekStrip
              weekStartDate={weekStart}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onPrevWeek={handlePrevWeek}
              onNextWeek={handleNextWeek}
              datesWithPlans={datesWithPlans}
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-1.5 text-muted-foreground"
                onClick={() => {
                  const d = new Date(selectedDate + "T00:00:00");
                  setViewYear(d.getFullYear());
                  setViewMonth(d.getMonth() + 1);
                  setShowFullCalendar(true);
                }}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Tüm Takvim
              </Button>
              {!isToday && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 gap-1.5 text-muted-foreground"
                  onClick={handleGoToToday}
                >
                  <CircleDot className="h-3.5 w-3.5" />
                  Bugün
                </Button>
              )}
            </div>
          </>
        )}

        {/* AI Weekly Plan Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => handleWeeklyModalOpenChange(true)}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI ile Haftalık Plan {data?.weeklyPlan ? "Değiştir" : "Oluştur"}
        </Button>

        <p className="text-sm text-muted-foreground">
          {formatTurkishDate(selectedDate)}
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : activeDailyPlanId ? (
          <DayDetailPanel
            dailyPlan={
              selectedDayPlan ?? {
                id: activeDailyPlanId,
                dayName: formatTurkishDate(selectedDate),
                planType: "workout",
              }
            }
          />
        ) : (
          <div className="text-center py-8 space-y-3">
            <Dumbbell className="h-12 w-12 mx-auto opacity-20 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Bu tarih için plan bulunamadı.
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => handleWeeklyModalOpenChange(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI ile Haftalık Plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCreatePlanForDate}
                disabled={creatingPlan}
              >
                <Plus className="h-3.5 w-3.5" />
                {creatingPlan ? "Oluşturuluyor..." : "Manuel Ekle"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {weeklyModalOpen && (
        <AiWeeklyPlanModal
          open={weeklyModalOpen}
          onOpenChange={handleWeeklyModalOpenChange}
          suggestedPlan={generateWeekly.data?.suggestedPlan ?? null}
          loading={generateWeekly.isPending}
          applying={applyWeekly.isPending}
          error={weeklyError}
          onGenerate={handleGenerateWeekly}
          onApply={handleApplyWeekly}
          onApplySaved={handleApplySaved}
          onReset={() => generateWeekly.reset()}
          hasExistingPlan={!!data?.weeklyPlan}
        />
      )}

      <ProfileMissingWarning
        open={profileWarningOpen}
        onOpenChange={setProfileWarningOpen}
        missingFields={missingFields}
      />
    </div>
  );
}
