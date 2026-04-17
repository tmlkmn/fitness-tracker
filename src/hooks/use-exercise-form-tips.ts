import { useQuery } from "@tanstack/react-query";
import { getExerciseFormTips } from "@/actions/ai";

export function useExerciseFormTips(
  exerciseName: string,
  exerciseNotes: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["exerciseFormTips", exerciseName, exerciseNotes ?? ""],
    queryFn: () => getExerciseFormTips(exerciseName, exerciseNotes),
    enabled,
    staleTime: Infinity,
  });
}
