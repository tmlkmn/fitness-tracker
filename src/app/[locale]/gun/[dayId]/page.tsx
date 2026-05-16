import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDailyPlan } from "@/actions/plans";
import { MealList } from "@/components/meals/meal-list";
import { WorkoutList } from "@/components/workout/workout-list";
import { SupplementTimeline } from "@/components/supplements/supplement-timeline";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Utensils, Dumbbell, Pill, HeartPulse, Lock, ChevronRight } from "lucide-react";
import { WaterTracker } from "@/components/water/water-tracker";
import { SleepEntry } from "@/components/sleep/sleep-entry";
import { ReadinessEntry } from "@/components/readiness/readiness-entry";
import { MacroTrendSparkline } from "@/components/meals/macro-trend-sparkline";
import { PageTour } from "@/components/onboarding/page-tour";
import { getTranslations } from "next-intl/server";
import { normalizeLocale } from "@/lib/locale";
import { formatDate, parseDateOnly } from "@/lib/date-format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ dayId: string; locale: string }>;
  searchParams: Promise<{ tab?: string; focus?: string }>;
}

const VALID_TABS = ["meals", "workout", "supplements", "wellness"] as const;
type ValidTab = (typeof VALID_TABS)[number];

export default async function GunPage({ params, searchParams }: PageProps) {
  const { dayId, locale } = await params;
  const { tab, focus } = await searchParams;
  const id = parseInt(dayId);
  const dailyPlan = await getDailyPlan(id);

  const t = await getTranslations({ locale, namespace: "day" });

  const initialTab: ValidTab = (VALID_TABS as readonly string[]).includes(
    tab ?? "",
  )
    ? (tab as ValidTab)
    : focus === "sleep" || focus === "readiness"
      ? "wellness"
      : "meals";

  if (!dailyPlan) notFound();

  // Past day detection — readOnly for past dates
  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const todayStr = getTurkeyTodayStr();
  const isPast = dailyPlan.date ? dailyPlan.date < todayStr : false;

  const dateLabel = dailyPlan.date
    ? formatDate(parseDateOnly(dailyPlan.date), normalizeLocale(locale), {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long",
      })
    : null;

  const planTypeKey = (["workout", "swimming", "rest"] as const).includes(
    dailyPlan.planType as "workout",
  )
    ? (dailyPlan.planType as "workout" | "swimming" | "rest")
    : null;
  const planTypeLabel = planTypeKey ? t(`planType.${planTypeKey}`) : dailyPlan.planType;

  const subtitle = dateLabel
    ? `${dateLabel} — ${dailyPlan.workoutTitle ?? planTypeLabel}`
    : (dailyPlan.workoutTitle ?? planTypeLabel);

  return (
    <div className="animate-fade-in">
      <Header
        title={dailyPlan.dayName}
        subtitle={subtitle}
        showBack
        backHref="/takvim"
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      {isPast && (
        <div className="sticky top-14 z-40 border-b border-warning/30 bg-warning/10 backdrop-blur px-4 py-2 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-warning shrink-0" />
          <p className="text-xs font-medium text-warning flex-1 min-w-0">
            {t("pastDayBanner.title")}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-warning hover:text-warning/80 shrink-0"
          >
            {t("pastDayBanner.cta")}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
      <PageTour surface="day" />
      <div className="p-4">
        <Tabs defaultValue={initialTab}>
          <TabsList
            data-tour="day-tabs"
            className="grid grid-cols-4 w-full mb-4 h-auto p-1"
          >
            <TabsTrigger
              value="meals"
              className="flex-col gap-0.5 py-1.5 data-[state=active]:font-semibold data-[state=active]:text-primary"
            >
              <Utensils className="h-4 w-4" />
              <span className="text-[10px] xs:text-xs truncate max-w-full">{t("tabs.nutrition")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="workout"
              className="flex-col gap-0.5 py-1.5 data-[state=active]:font-semibold data-[state=active]:text-primary"
            >
              <Dumbbell className="h-4 w-4" />
              <span className="text-[10px] xs:text-xs truncate max-w-full">{t("tabs.workout")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="supplements"
              className="flex-col gap-0.5 py-1.5 data-[state=active]:font-semibold data-[state=active]:text-primary"
            >
              <Pill className="h-4 w-4" />
              <span className="text-[10px] xs:text-xs truncate max-w-full">{t("tabs.supplements")}</span>
            </TabsTrigger>
            <TabsTrigger
              value="wellness"
              className="flex-col gap-0.5 py-1.5 data-[state=active]:font-semibold data-[state=active]:text-primary"
            >
              <HeartPulse className="h-4 w-4" />
              <span className="text-[10px] xs:text-xs truncate max-w-full">{t("tabs.wellness")}</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="meals" className="space-y-3" data-tour="day-content">
            {false && dailyPlan.date && (
              <MacroTrendSparkline endDate={dailyPlan.date!} metric="calories" />
            )}
            <MealList
              dailyPlanId={id}
              readOnly={isPast}
              planDate={dailyPlan.date ?? undefined}
              dailyPlanType={dailyPlan.planType}
            />
          </TabsContent>
          <TabsContent value="workout">
            <WorkoutList
              dailyPlanId={id}
              readOnly={isPast}
              planDate={dailyPlan.date ?? undefined}
              workoutTitle={dailyPlan.workoutTitle}
            />
          </TabsContent>
          <TabsContent value="supplements">
            {dailyPlan.weeklyPlanId && (
              <SupplementTimeline
                weeklyPlanId={dailyPlan.weeklyPlanId}
                date={dailyPlan.date ?? undefined}
                readOnly={isPast}
              />
            )}
          </TabsContent>
          <TabsContent value="wellness" className="space-y-3">
            {dailyPlan.date && (
              <>
                <WaterTracker date={dailyPlan.date} readOnly={isPast} />
                <div id="uyku" className="scroll-mt-20">
                  <SleepEntry
                    date={dailyPlan.date}
                    readOnly={isPast}
                    autoOpen={focus === "sleep"}
                  />
                </div>
                {!isPast && (
                  <div id="readiness" className="scroll-mt-20">
                    <ReadinessEntry autoOpen={focus === "readiness"} />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
