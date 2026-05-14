import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getMealsByDay } from "@/actions/meals";
import { hapticSuccess, hapticTap } from "@/lib/haptics";
import { enqueueOutbox } from "@/lib/outbox";
import { drainOutbox } from "@/lib/outbox-drain";

type Meal = Awaited<ReturnType<typeof getMealsByDay>>[number];

export function useMeals(dailyPlanId: number) {
  return useQuery({
    queryKey: ["meals.byDay", dailyPlanId],
    queryFn: () => getMealsByDay(dailyPlanId),
    enabled: !!dailyPlanId,
    meta: { persist: true },
  });
}

export function useToggleMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      isCompleted,
    }: {
      id: number;
      isCompleted: boolean;
    }) => {
      // Outbox-first: always enqueue, never throw on network.
      // The drainer handles online replay; optimistic UI stays intact regardless.
      await enqueueOutbox("meal", { id, isCompleted });
      void drainOutbox(qc);
      return { queued: true } as const;
    },
    onMutate: async ({ id, isCompleted }) => {
      if (isCompleted) hapticSuccess();
      else hapticTap();
      await qc.cancelQueries({ queryKey: ["meals.byDay"] });
      const queries = qc.getQueriesData<Meal[]>({ queryKey: ["meals.byDay"] });
      const snapshots: Array<[readonly unknown[], Meal[] | undefined]> = [];
      for (const [key, data] of queries) {
        snapshots.push([key, data]);
        if (data) {
          qc.setQueryData<Meal[]>(key, data.map((m) =>
            m.id === id ? { ...m, isCompleted } : m
          ));
        }
      }
      return { snapshots };
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
            void enqueueOutbox("meal", { id, isCompleted: !isCompleted }).then(
              () => {
                void drainOutbox(qc);
                qc.invalidateQueries({ queryKey: ["meals.byDay"] });
                qc.invalidateQueries({ queryKey: ["today-dashboard"] });
              },
            );
          },
        },
      });
    },
  });
}
