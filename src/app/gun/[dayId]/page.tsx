import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDailyPlan } from "@/actions/plans";
import { MealList } from "@/components/meals/meal-list";
import { WorkoutList } from "@/components/workout/workout-list";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ dayId: string }>;
}

const planTypeLabel: Record<string, string> = {
  workout: "🏋️ Antrenman Günü",
  swimming: "🏊 Yüzme Günü",
  rest: "😴 Dinlenme Günü",
};

export default async function GunPage({ params }: PageProps) {
  const { dayId } = await params;
  const id = parseInt(dayId);
  const dailyPlan = await getDailyPlan(id);

  if (!dailyPlan) notFound();

  const subtitle =
    dailyPlan.workoutTitle ??
    planTypeLabel[dailyPlan.planType] ??
    dailyPlan.planType;

  return (
    <div>
      <Header title={dailyPlan.dayName} subtitle={subtitle} />
      <div className="p-4">
        <Tabs defaultValue="meals">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="meals">🍽️ Beslenme</TabsTrigger>
            <TabsTrigger value="workout">💪 Antrenman</TabsTrigger>
          </TabsList>
          <TabsContent value="meals">
            <MealList dailyPlanId={id} />
          </TabsContent>
          <TabsContent value="workout">
            <WorkoutList dailyPlanId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
