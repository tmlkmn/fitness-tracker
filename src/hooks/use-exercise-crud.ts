import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createExercise,
  updateExercise,
  deleteExercise,
  deleteAllExercises,
} from "@/actions/exercise-crud";

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

export function useDeleteAllExercises() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dailyPlanId: number) => deleteAllExercises(dailyPlanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
