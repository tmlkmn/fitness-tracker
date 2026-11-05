import { useQuery } from "@tanstack/react-query";
import { getExerciseDemo } from "@/actions/exercise-demo";

export function useExerciseDemo(
  exerciseName: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["exerciseDemo", exerciseName],
    queryFn: () => getExerciseDemo(exerciseName),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
