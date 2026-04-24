"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealList } from "@/components/meals/meal-list";
import { WorkoutList } from "@/components/workout/workout-list";
import { UtensilsCrossed, Dumbbell } from "lucide-react";
import { useUserProfile } from "@/hooks/use-user";

interface DayDetailPanelProps {
  dailyPlan: {
    id: number;
    dayName: string;
    planType: string;
    workoutTitle?: string | null;
    date?: string | null;
  };
  readOnly?: boolean;
}

export function DayDetailPanel({ dailyPlan, readOnly }: DayDetailPanelProps) {
  const { data: profile } = useUserProfile();
  const isNutritionOnly = profile?.serviceType === "nutrition";

  return (
    <>
      {isNutritionOnly ? (
        <MealList
          dailyPlanId={dailyPlan.id}
          readOnly={readOnly}
          planDate={dailyPlan.date ?? undefined}
          dailyPlanType={dailyPlan.planType}
        />
      ) : (
        <Tabs defaultValue="meals">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="meals" className="gap-1.5 text-xs">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Öğünler
            </TabsTrigger>
            <TabsTrigger value="workout" className="gap-1.5 text-xs">
              <Dumbbell className="h-3.5 w-3.5" />
              Antrenman
            </TabsTrigger>
          </TabsList>
          <TabsContent value="meals">
            <MealList
              dailyPlanId={dailyPlan.id}
              readOnly={readOnly}
              planDate={dailyPlan.date ?? undefined}
              dailyPlanType={dailyPlan.planType}
            />
          </TabsContent>
          <TabsContent value="workout">
            <WorkoutList
              dailyPlanId={dailyPlan.id}
              readOnly={readOnly}
              planDate={dailyPlan.date ?? undefined}
            />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
