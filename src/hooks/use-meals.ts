import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMealsByDay, toggleMealCompleted } from "@/actions/meals";
import { hapticSuccess, hapticTap, hapticError } from "@/lib/haptics";

type Meal = Awaited<ReturnType<typeof getMealsByDay>>[number];

export function useMeals(dailyPlanId: number) {
  return useQuery({
    queryKey: ["meals.byDay", dailyPlanId],
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
      if (isCompleted) hapticSuccess();
      else hapticTap();
      await qc.cancelQueries({ queryKey: ["meals.byDay"] });
      const queries = qc.getQueriesData<Meal[]>({ queryKey: ["meals.byDay"] });
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
      hapticError();
      toast.error("Öğün durumu güncellenemedi");
    },
    onSuccess: (_data, variables, context) => {
      const { id, isCompleted } = variables;
      const previouslyCompleted = context?.snapshots
        ?.flatMap(([, data]) => data ?? [])
        .find((m) => m.id === id)?.isCompleted;
      const didToggle = previouslyCompleted !== isCompleted;
      if (!didToggle && !isCompleted) return;

      const message = isCompleted ? "Öğün tamamlandı" : "Tamamlanma geri alındı";
      toast.success(message, {
        duration: 5000,
        action: {
          label: "Geri Al",
          onClick: () => {
            toggleMealCompleted(id, !isCompleted)
              .then(() => {
                qc.invalidateQueries({ queryKey: ["meals.byDay"] });
                qc.invalidateQueries({ queryKey: ["today-dashboard"] });
              })
              .catch(() => {
                toast.error("Geri alma başarısız");
              });
          },
        },
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["meals.byDay"] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
    },
  });
}
