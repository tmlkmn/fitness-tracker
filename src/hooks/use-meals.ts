import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMealsByDay, toggleMealCompleted } from "@/actions/meals";

type Meal = Awaited<ReturnType<typeof getMealsByDay>>[number];

export function useMeals(dailyPlanId: number) {
  return useQuery({
    queryKey: ["meals", dailyPlanId],
    queryFn: () => getMealsByDay(dailyPlanId),
    enabled: !!dailyPlanId,
  });
}

export function useToggleMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isCompleted,
    }: {
      id: number;
      isCompleted: boolean;
    }) => toggleMealCompleted(id, isCompleted),
    onMutate: async ({ id, isCompleted }) => {
      const queries = qc.getQueriesData<Meal[]>({ queryKey: ["meals"] });
      const snapshots: Array<[readonly unknown[], Meal[] | undefined]> = [];
      for (const [key, data] of queries) {
        snapshots.push([key, data]);
        if (data) {
          qc.setQueryData<Meal[]>(key as string[], data.map((m) =>
            m.id === id ? { ...m, isCompleted } : m
          ));
        }
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["meals"] });
    },
  });
}
