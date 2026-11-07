import { useQuery } from "@tanstack/react-query";
import { callAction } from "@/lib/safe-action";

export function useExerciseDemo(
  exerciseName: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["exerciseDemo", exerciseName],
    queryFn: () => callAction("getExerciseDemo", exerciseName),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}
