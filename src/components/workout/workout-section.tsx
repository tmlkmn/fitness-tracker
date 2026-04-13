import { ExerciseCard } from "./exercise-card";
import { Separator } from "@/components/ui/separator";

interface Exercise {
  id: number;
  section: string;
  sectionLabel: string;
  name: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  isCompleted: boolean | null;
  sortOrder: number;
}

interface WorkoutSectionProps {
  sectionLabel: string;
  exercises: Exercise[];
  onToggle: (id: number, isCompleted: boolean) => void;
}

export function WorkoutSection({
  sectionLabel,
  exercises,
  onToggle,
}: WorkoutSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">
          {sectionLabel}
        </span>
        <Separator className="flex-1" />
      </div>
      <div className="space-y-2">
        {exercises.map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            {...exercise}
            isCompleted={exercise.isCompleted ?? false}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
