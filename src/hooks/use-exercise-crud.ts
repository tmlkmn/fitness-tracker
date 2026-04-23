import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createExercise,
  updateExercise,
  deleteExercise,
  deleteAllExercises,
  bulkCreateExercises,
} from "@/actions/exercise-crud";

type ExerciseSnapshot = {
  id: number;
  dailyPlanId: number;
  section: string;
  sectionLabel: string;
  name: string;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
};

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      data,
    }: {
      dailyPlanId: number;
      data: {
        section: string;
        sectionLabel: string;
        name: string;
        sets?: number | null;
        reps?: string | null;
        restSeconds?: number | null;
        durationMinutes?: number | null;
        notes?: string | null;
      };
    }) => createExercise(dailyPlanId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

export function useUpdateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      exerciseId,
      data,
    }: {
      exerciseId: number;
      data: {
        section: string;
        sectionLabel: string;
        name: string;
        sets?: number | null;
        reps?: string | null;
        restSeconds?: number | null;
        durationMinutes?: number | null;
        notes?: string | null;
      };
    }) => updateExercise(exerciseId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (exerciseId: number) => deleteExercise(exerciseId),
    onMutate: async (exerciseId) => {
      await qc.cancelQueries({ queryKey: ["exercises"] });
      const queries = qc.getQueriesData<ExerciseSnapshot[]>({
        queryKey: ["exercises"],
      });
      let snapshot: ExerciseSnapshot | undefined;
      for (const [key, data] of queries) {
        if (Array.isArray(data)) {
          const found = data.find((e) => e.id === exerciseId);
          if (found) snapshot = found;
          qc.setQueryData(
            key,
            data.filter((e) => e.id !== exerciseId),
          );
        }
      }
      return { queries, snapshot };
    },
    onError: (_err, _id, context) => {
      if (context?.queries) {
        for (const [key, data] of context.queries) {
          qc.setQueryData(key, data);
        }
      }
      toast.error("Egzersiz silinemedi");
    },
    onSuccess: (_data, _id, context) => {
      const snap = context?.snapshot;
      if (!snap) {
        toast.success("Egzersiz silindi");
        return;
      }
      toast.success(`"${snap.name}" silindi`, {
        duration: 6000,
        action: {
          label: "Geri Al",
          onClick: async () => {
            try {
              await createExercise(snap.dailyPlanId, {
                section: snap.section,
                sectionLabel: snap.sectionLabel,
                name: snap.name,
                sets: snap.sets ?? null,
                reps: snap.reps ?? null,
                restSeconds: snap.restSeconds ?? null,
                durationMinutes: snap.durationMinutes ?? null,
                notes: snap.notes ?? null,
              });
              qc.invalidateQueries({ queryKey: ["exercises"] });
              qc.invalidateQueries({ queryKey: ["today-dashboard"] });
              toast.success("Geri alındı");
            } catch {
              toast.error("Geri alma başarısız");
            }
          },
        },
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

export function useDeleteAllExercises() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyPlanId: number) => deleteAllExercises(dailyPlanId),
    onMutate: async (dailyPlanId) => {
      await qc.cancelQueries({ queryKey: ["exercises", dailyPlanId] });
      const snapshot = qc.getQueryData<ExerciseSnapshot[]>([
        "exercises",
        dailyPlanId,
      ]);
      qc.setQueryData(["exercises", dailyPlanId], []);
      return { snapshot };
    },
    onError: (_err, dailyPlanId, context) => {
      if (context?.snapshot) {
        qc.setQueryData(["exercises", dailyPlanId], context.snapshot);
      }
      toast.error("Egzersizler silinemedi");
    },
    onSuccess: (_data, dailyPlanId, context) => {
      const snap = context?.snapshot;
      const count = snap?.length ?? 0;
      if (!snap || count === 0) {
        toast.success("Egzersizler silindi");
        return;
      }
      toast.success(`${count} egzersiz silindi`, {
        duration: 8000,
        action: {
          label: "Geri Al",
          onClick: async () => {
            try {
              await bulkCreateExercises(
                dailyPlanId,
                snap.map((e) => ({
                  section: e.section,
                  sectionLabel: e.sectionLabel,
                  name: e.name,
                  sets: e.sets ?? null,
                  reps: e.reps ?? null,
                  restSeconds: e.restSeconds ?? null,
                  durationMinutes: e.durationMinutes ?? null,
                  notes: e.notes ?? null,
                })),
              );
              qc.invalidateQueries({ queryKey: ["exercises"] });
              qc.invalidateQueries({ queryKey: ["today-dashboard"] });
              toast.success(`${count} egzersiz geri yüklendi`);
            } catch {
              toast.error("Geri alma başarısız");
            }
          },
        },
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
