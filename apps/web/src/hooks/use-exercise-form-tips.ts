import { useQuery } from "@tanstack/react-query";
import { callAction } from "@/lib/safe-action";

export function useExerciseFormTips(
  exerciseName: string,
  exerciseNotes: string | null,
  enabled: boolean,
  englishName: string | null = null,
) {
  return useQuery({
    queryKey: ["exerciseFormTips", exerciseName, exerciseNotes ?? "", englishName ?? ""],
    queryFn: () => callAction("getExerciseFormTips", exerciseName, exerciseNotes, englishName),
    enabled,
    staleTime: Infinity,
  });
}
