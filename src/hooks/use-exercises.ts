import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getExercisesByDay } from "@/actions/exercises";
import { hapticSuccess, hapticTap } from "@/lib/haptics";
import { enqueueOutbox } from "@/lib/outbox";
import { drainOutbox } from "@/lib/outbox-drain";

type Exercise = Awaited<ReturnType<typeof getExercisesByDay>>[number];

export function useExercises(dailyPlanId: number) {
  return useQuery({
    queryKey: ["exercises", dailyPlanId],
    queryFn: () => getExercisesByDay(dailyPlanId),
    enabled: !!dailyPlanId,
    meta: { persist: true },
  });
}

export function useToggleExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      isCompleted,
    }: {
      id: number;
      isCompleted: boolean;
    }) => {
      await enqueueOutbox("exercise", { id, isCompleted });
      void drainOutbox(qc);
      return { queued: true } as const;
    },
    onMutate: async ({ id, isCompleted }) => {
      if (isCompleted) hapticSuccess();
      else hapticTap();
      await qc.cancelQueries({ queryKey: ["exercises"] });
      const queries = qc.getQueriesData<Exercise[]>({ queryKey: ["exercises"] });
      const snapshots: Array<[readonly unknown[], Exercise[] | undefined]> = [];
      for (const [key, data] of queries) {
        snapshots.push([key, data]);
        if (data) {
          qc.setQueryData<Exercise[]>(key, data.map((e) =>
            e.id === id ? { ...e, isCompleted } : e
          ));
        }
      }
      return { snapshots };
    },
    onSuccess: (_data, variables, context) => {
      const { id, isCompleted } = variables;
      const previouslyCompleted = context?.snapshots
        ?.flatMap(([, data]) => data ?? [])
        .find((e) => e.id === id)?.isCompleted;
      const didToggle = previouslyCompleted !== isCompleted;
      if (!didToggle && !isCompleted) return;

      const message = isCompleted ? "Egzersiz tamamlandı" : "Tamamlanma geri alındı";
      toast.success(message, {
        duration: 5000,
        action: {
          label: "Geri Al",
          onClick: () => {
            void enqueueOutbox("exercise", {
              id,
              isCompleted: !isCompleted,
            }).then(() => {
              void drainOutbox(qc);
              qc.invalidateQueries({ queryKey: ["exercises"] });
              qc.invalidateQueries({ queryKey: ["today-dashboard"] });
            });
          },
        },
      });
    },
  });
}
