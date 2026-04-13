import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMealsByDay, toggleMealCompleted } from "@/actions/meals";

export function useMeals(dailyPlanId: number) {
  return useQuery({
    queryKey: ["meals", dailyPlanId],
    queryFn: () => getMealsByDay(dailyPlanId),
    enabled: !!dailyPlanId,
  });
}

export function useToggleMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isCompleted,
    }: {
      id: number;
      isCompleted: boolean;
    }) => toggleMealCompleted(id, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}
