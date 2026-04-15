"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealList } from "@/components/meals/meal-list";
import { MealAgenda } from "@/components/meals/meal-agenda";
import { WorkoutList } from "@/components/workout/workout-list";
import { AiMealModal } from "@/components/meals/ai-meal-modal";
import { UtensilsCrossed, Clock, Dumbbell } from "lucide-react";
import { useGenerateDailyMeals, useApplyDailyMeals } from "@/hooks/use-meal-ai";
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
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const generateMeals = useGenerateDailyMeals();
  const applyMeals = useApplyDailyMeals();
  const { data: profile } = useUserProfile();
  const isNutritionOnly = profile?.serviceType === "nutrition";

  const handleGenerateMeals = (userNote?: string) => {
    generateMeals.mutate({ dailyPlanId: dailyPlan.id, userNote });
  };

  const handleApplyMeals = () => {
    if (!generateMeals.data?.suggestedMeals) return;
    applyMeals.mutate(
      { dailyPlanId: dailyPlan.id, meals: generateMeals.data.suggestedMeals },
      {
        onSuccess: () => {
          setMealModalOpen(false);
          generateMeals.reset();
        },
      },
    );
  };

  const handleMealModalOpenChange = (open: boolean) => {
    setMealModalOpen(open);
    if (!open) {
      generateMeals.reset();
    }
  };

  const mealError = generateMeals.error
    ? generateMeals.error.message === "RATE_LIMITED"
      ? "Çok fazla istek gönderdiniz. Lütfen biraz bekleyin."
      : "AI özelliği şu anda kullanılamıyor. Daha sonra tekrar deneyin."
    : null;

  return (
    <>
      <Tabs defaultValue="meals">
        <TabsList className={`grid w-full ${isNutritionOnly ? "grid-cols-2" : "grid-cols-3"}`}>
          <TabsTrigger value="meals" className="gap-1.5 text-xs">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Öğünler
          </TabsTrigger>
          <TabsTrigger value="agenda" className="gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5" />
            Ajanda
          </TabsTrigger>
          {!isNutritionOnly && (
            <TabsTrigger value="workout" className="gap-1.5 text-xs">
              <Dumbbell className="h-3.5 w-3.5" />
              Antrenman
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="meals">
          <MealList
            dailyPlanId={dailyPlan.id}
            readOnly={readOnly}
            onAiGenerate={readOnly ? undefined : () => handleMealModalOpenChange(true)}
          />
        </TabsContent>
        <TabsContent value="agenda">
          <MealAgenda dailyPlanId={dailyPlan.id} />
        </TabsContent>
        {!isNutritionOnly && (
          <TabsContent value="workout">
            <WorkoutList
              dailyPlanId={dailyPlan.id}
              readOnly={readOnly}
            />
          </TabsContent>
        )}
      </Tabs>

      {mealModalOpen && (
        <AiMealModal
          open={mealModalOpen}
          onOpenChange={handleMealModalOpenChange}
          suggestedMeals={generateMeals.data?.suggestedMeals ?? null}
          loading={generateMeals.isPending}
          applying={applyMeals.isPending}
          error={mealError}
          onGenerate={handleGenerateMeals}
          onApply={handleApplyMeals}
        />
      )}
    </>
  );
}
