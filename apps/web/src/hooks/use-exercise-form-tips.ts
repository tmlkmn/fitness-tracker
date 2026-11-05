import { useQuery } from "@tanstack/react-query";
import { getExerciseFormTips } from "@/actions/ai";

export function useExerciseFormTips(
  exerciseName: string,
  exerciseNotes: string | null,
  enabled: boolean,
  englishName: string | null = null,
) {
  return useQuery({
    queryKey: ["exerciseFormTips", exerciseName, exerciseNotes ?? "", englishName ?? ""],
    queryFn: () => getExerciseFormTips(exerciseName, exerciseNotes, englishName),
    enabled,
    staleTime: Infinity,
  });
}
