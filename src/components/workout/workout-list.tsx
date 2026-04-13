"use client";

import { useExercises, useToggleExercise } from "@/hooks/use-exercises";
import { WorkoutSection } from "./workout-section";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkoutListProps {
  dailyPlanId: number;
}

export function WorkoutList({ dailyPlanId }: WorkoutListProps) {
  const { data: exerciseList, isLoading } = useExercises(dailyPlanId);
  const toggleExercise = useToggleExercise();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!exerciseList?.length) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Bu gün için antrenman programı yok
      </p>
    );
  }

  const sectionOrder = ["warmup", "main", "cooldown", "sauna", "swimming"];

  const sections = exerciseList.reduce(
    (acc, exercise) => {
      const key = exercise.section;
      if (!acc[key]) {
        acc[key] = { label: exercise.sectionLabel, exercises: [] };
      }
      acc[key].exercises.push(exercise);
      return acc;
    },
    {} as Record<
      string,
      { label: string; exercises: typeof exerciseList }
    >
  );

  const sortedSections = Object.entries(sections).sort(
    ([a], [b]) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b)
  );

  const totalExercises = exerciseList.length;
  const completedExercises = exerciseList.filter((e) => e.isCompleted).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {completedExercises}/{totalExercises} tamamlandı
        </span>
      </div>
      {sortedSections.map(([section, { label, exercises }]) => (
        <WorkoutSection
          key={section}
          sectionLabel={label}
          exercises={exercises}
          onToggle={(id, completed) =>
            toggleExercise.mutate({ id, isCompleted: completed })
          }
        />
      ))}
    </div>
  );
}
