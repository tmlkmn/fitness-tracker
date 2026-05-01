import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDailyPlan } from "@/actions/plans";
import { MealList } from "@/components/meals/meal-list";
import { WorkoutList } from "@/components/workout/workout-list";
import { SupplementTimeline } from "@/components/supplements/supplement-timeline";
import { notFound } from "next/navigation";
import { Utensils, Dumbbell, Pill } from "lucide-react";
import { WaterTracker } from "@/components/water/water-tracker";
import { SleepEntry } from "@/components/sleep/sleep-entry";
import { MacroTrendSparkline } from "@/components/meals/macro-trend-sparkline";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ dayId: string }>;
  searchParams: Promise<{ tab?: string; focus?: string }>;
}

const VALID_TABS = ["meals", "workout", "supplements"] as const;
type ValidTab = (typeof VALID_TABS)[number];

const planTypeLabel: Record<string, string> = {
  workout: "Antrenman Günü",
  swimming: "Yüzme Günü",
  rest: "Dinlenme Günü",
};

export default async function GunPage({ params, searchParams }: PageProps) {
  const { dayId } = await params;
  const { tab, focus } = await searchParams;
  const id = parseInt(dayId);
  const dailyPlan = await getDailyPlan(id);

  const initialTab: ValidTab = (VALID_TABS as readonly string[]).includes(
    tab ?? "",
  )
    ? (tab as ValidTab)
    : "meals";

  if (!dailyPlan) notFound();

  // Past day detection — readOnly for past dates
  const { getTurkeyTodayStr } = await import("@/lib/utils");
  const todayStr = getTurkeyTodayStr();
  const isPast = dailyPlan.date ? dailyPlan.date < todayStr : false;

  const dateLabel = dailyPlan.date
    ? new Date(dailyPlan.date + "T00:00:00").toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long",
      })
    : null;

  const subtitle = dateLabel
    ? `${dateLabel} — ${dailyPlan.workoutTitle ?? planTypeLabel[dailyPlan.planType] ?? dailyPlan.planType}`
    : (dailyPlan.workoutTitle ??
      planTypeLabel[dailyPlan.planType] ??
      dailyPlan.planType);

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
      <div className="p-4">
        <Tabs defaultValue={initialTab}>
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="meals" className="gap-1.5">
              <Utensils className="h-4 w-4" />
              Beslenme
            </TabsTrigger>
            <TabsTrigger value="workout" className="gap-1.5">
              <Dumbbell className="h-4 w-4" />
              Antrenman
            </TabsTrigger>
            <TabsTrigger value="supplements" className="gap-1.5">
              <Pill className="h-4 w-4" />
              Takviye
            </TabsTrigger>
          </TabsList>
          <TabsContent value="meals" className="space-y-3">
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
        </Tabs>

        {/* Su & Uyku Takibi */}
        {dailyPlan.date && (
          <div className="space-y-3 mt-4">
            <WaterTracker date={dailyPlan.date} readOnly={isPast} />
            <div id="uyku" className="scroll-mt-20">
              <SleepEntry
                date={dailyPlan.date}
                readOnly={isPast}
                autoOpen={focus === "sleep"}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
