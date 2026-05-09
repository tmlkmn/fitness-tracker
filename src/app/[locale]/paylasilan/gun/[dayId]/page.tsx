"use client";

import { use } from "react";
import { Header } from "@/components/layout/header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderMenu } from "@/components/layout/header-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Utensils, Dumbbell, Eye } from "lucide-react";
import { useSharedDailyPlan, useSharedMealsByDay, useSharedExercisesByDay } from "@/hooks/use-shared-plans";
import { MealCard } from "@/components/meals/meal-card";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { Separator } from "@/components/ui/separator";
import { useLocale, useTranslations } from "next-intl";

interface PageProps {
  params: Promise<{ dayId: string }>;
}

export default function PaylasilanGunPage({ params }: PageProps) {
  const { dayId } = use(params);
  const id = parseInt(dayId);
  const { data: dailyPlan, isLoading: loadingPlan } = useSharedDailyPlan(id);
  const { data: meals, isLoading: loadingMeals } = useSharedMealsByDay(id);
  const { data: exercises, isLoading: loadingExercises } = useSharedExercisesByDay(id);
  const t = useTranslations("sharing");
  const tDay = useTranslations("day");
  const locale = useLocale();

  const isLoading = loadingPlan || loadingMeals || loadingExercises;

  const dateLabel = dailyPlan?.date
    ? new Date(dailyPlan.date + "T00:00:00").toLocaleDateString(
        locale === "en" ? "en-US" : "tr-TR",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
          weekday: "long",
        },
      )
    : null;

  const planTypeDayLabel = (planType: string | undefined): string => {
    if (!planType) return "";
    if ((["workout", "swimming", "rest"] as const).includes(planType as "workout")) {
      return t(`planTypeDay.${planType as "workout" | "swimming" | "rest"}`);
    }
    return planType;
  };

  const subtitle = dateLabel
    ? `${dateLabel} — ${dailyPlan?.workoutTitle ?? planTypeDayLabel(dailyPlan?.planType)}`
    : dailyPlan?.workoutTitle ?? planTypeDayLabel(dailyPlan?.planType);

  const sections = exercises?.reduce(
    (acc, exercise) => {
      const key = exercise.section;
      if (!acc[key]) {
        acc[key] = { label: exercise.sectionLabel, exercises: [] };
      }
      acc[key].exercises.push(exercise);
      return acc;
    },
    {} as Record<string, { label: string; exercises: typeof exercises }>
  );

  const sectionOrder = ["warmup", "main", "cooldown", "sauna", "swimming"];
  const sortedSections = sections
    ? Object.entries(sections).sort(
        ([a], [b]) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b)
      )
    : [];

  return (
    <div className="animate-fade-in">
      <Header
        title={dailyPlan?.dayName ?? t("loading")}
        subtitle={subtitle}
        showBack
        backHref={dailyPlan ? `/paylasilan/hafta/${dailyPlan.weeklyPlanId}` : "/paylasilan"}
        rightSlot={
          <div className="flex items-center gap-1">
            <NotificationBell />
            <HeaderMenu />
          </div>
        }
      />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4 p-2 rounded-md bg-primary/10 border border-primary/20">
          <Eye className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-primary">{t("readOnlyNotice")}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="meals">
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="meals" className="gap-1.5">
                <Utensils className="h-4 w-4" />
                {tDay("tabs.nutrition")}
              </TabsTrigger>
              <TabsTrigger value="workout" className="gap-1.5">
                <Dumbbell className="h-4 w-4" />
                {tDay("tabs.workout")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="meals">
              {!meals?.length ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("noMeals")}
                </p>
              ) : (
                <div className="space-y-3">
                  {meals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      {...meal}
                      isCompleted={meal.isCompleted ?? false}
                      readOnly
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="workout">
              {!sortedSections.length ? (
                <p className="text-center text-muted-foreground py-8">
                  {t("noWorkout")}
                </p>
              ) : (
                <div className="space-y-6">
                  {sortedSections.map(([section, { label, exercises: sectionExercises }]) => (
                    <div key={section}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">
                          {label}
                        </span>
                        <Separator className="flex-1" />
                      </div>
                      <div className="space-y-2">
                        {sectionExercises.map((exercise) => (
                          <ExerciseCard
                            key={exercise.id}
                            {...exercise}
                            isCompleted={exercise.isCompleted ?? false}
                            readOnly
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
