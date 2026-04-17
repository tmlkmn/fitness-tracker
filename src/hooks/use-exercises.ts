import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExercisesByDay, toggleExerciseCompleted } from "@/actions/exercises";

type Exercise = Awaited<ReturnType<typeof getExercisesByDay>>[number];

export function useExercises(dailyPlanId: number) {
  return useQuery({
    queryKey: ["exercises", dailyPlanId],
    queryFn: () => getExercisesByDay(dailyPlanId),
    enabled: !!dailyPlanId,
  });
}

export function useToggleExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isCompleted,
    }: {
      id: number;
      isCompleted: boolean;
    }) => toggleExerciseCompleted(id, isCompleted),
    onMutate: async ({ id, isCompleted }) => {
      await qc.cancelQueries({ queryKey: ["exercises"] });
      // Optimistically update all exercise query caches
      const queries = qc.getQueriesData<Exercise[]>({ queryKey: ["exercises"] });
      const snapshots: Array<[readonly unknown[], Exercise[] | undefined]> = [];
      for (const [key, data] of queries) {
        snapshots.push([key, data]);
        if (data) {
          qc.setQueryData<Exercise[]>(key as string[], data.map((e) =>
            e.id === id ? { ...e, isCompleted } : e
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
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
    },
  });
}
