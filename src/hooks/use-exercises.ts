import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExercisesByDay, toggleExerciseCompleted } from "@/actions/exercises";

export function useExercises(dailyPlanId: number) {
  return useQuery({
    queryKey: ["exercises", dailyPlanId],
    queryFn: () => getExercisesByDay(dailyPlanId),
    enabled: !!dailyPlanId,
  });
}

export function useToggleExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isCompleted,
    }: {
      id: number;
      isCompleted: boolean;
    }) => toggleExerciseCompleted(id, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
