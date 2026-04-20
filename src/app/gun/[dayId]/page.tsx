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

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ dayId: string }>;
}

const planTypeLabel: Record<string, string> = {
  workout: "Antrenman Günü",
  swimming: "Yüzme Günü",
  rest: "Dinlenme Günü",
};

export default async function GunPage({ params }: PageProps) {
  const { dayId } = await params;
  const id = parseInt(dayId);
  const dailyPlan = await getDailyPlan(id);

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
        <Tabs defaultValue="meals">
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
          <TabsContent value="meals">
            <MealList dailyPlanId={id} readOnly={isPast} dailyPlanType={dailyPlan.planType} />
          </TabsContent>
          <TabsContent value="workout">
            <WorkoutList dailyPlanId={id} readOnly={isPast} />
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
            <SleepEntry date={dailyPlan.date} readOnly={isPast} />
          </div>
        )}
      </div>
    </div>
  );
}
