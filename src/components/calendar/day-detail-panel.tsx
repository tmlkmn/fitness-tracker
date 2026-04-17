"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealList } from "@/components/meals/meal-list";
import { WorkoutList } from "@/components/workout/workout-list";
import { AiMealModal } from "@/components/meals/ai-meal-modal";
import { ProfileMissingWarning } from "@/components/ai/profile-missing-warning";
import { UtensilsCrossed, Dumbbell } from "lucide-react";
import { useGenerateDailyMeals, useApplyDailyMeals } from "@/hooks/use-meal-ai";
import { useUserProfile } from "@/hooks/use-user";
import { useProfileCheck } from "@/hooks/use-profile-check";

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
  const [profileWarningOpen, setProfileWarningOpen] = useState(false);
  const generateMeals = useGenerateDailyMeals();
  const applyMeals = useApplyDailyMeals();
  const { data: profile } = useUserProfile();
  const { missingFields } = useProfileCheck();
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
    if (open && missingFields.length > 0) {
      setProfileWarningOpen(true);
      return;
    }
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
      {isNutritionOnly ? (
        <MealList
          dailyPlanId={dailyPlan.id}
          readOnly={readOnly}
          onAiGenerate={readOnly ? undefined : () => handleMealModalOpenChange(true)}
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
              onAiGenerate={readOnly ? undefined : () => handleMealModalOpenChange(true)}
            />
          </TabsContent>
          <TabsContent value="workout">
            <WorkoutList
              dailyPlanId={dailyPlan.id}
              readOnly={readOnly}
            />
          </TabsContent>
        </Tabs>
      )}

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

      <ProfileMissingWarning
        open={profileWarningOpen}
        onOpenChange={setProfileWarningOpen}
        missingFields={missingFields}
      />
    </>
  );
}
