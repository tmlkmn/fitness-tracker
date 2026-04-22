import { useQuery } from "@tanstack/react-query";
import { getExerciseDemo } from "@/actions/exercise-demo";

export function useExerciseDemo(
  exerciseName: string,
  enabled: boolean,
  englishName?: string | null,
) {
  return useQuery({
    queryKey: ["exerciseDemo", exerciseName, englishName ?? null],
    queryFn: () => getExerciseDemo(exerciseName, englishName ?? undefined),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
