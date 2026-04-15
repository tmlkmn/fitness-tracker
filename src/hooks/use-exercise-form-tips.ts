import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getExerciseFormTips,
  regenerateExerciseFormTips,
} from "@/actions/ai";

export function useExerciseFormTips(
  exerciseName: string,
  exerciseNotes: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["exerciseFormTips", exerciseName, exerciseNotes ?? ""],
    queryFn: () => getExerciseFormTips(exerciseName, exerciseNotes),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegenerateExerciseFormTips() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      exerciseName,
      exerciseNotes,
    }: {
      exerciseName: string;
      exerciseNotes: string | null;
    }) => regenerateExerciseFormTips(exerciseName, exerciseNotes),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: [
          "exerciseFormTips",
          variables.exerciseName,
          variables.exerciseNotes ?? "",
        ],
      });
    },
  });
}
