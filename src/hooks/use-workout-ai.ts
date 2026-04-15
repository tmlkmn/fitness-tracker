import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateWorkoutReplacement,
  applyWorkoutReplacement,
  generateSectionReplacement,
  applySectionReplacement,
  generateExerciseVariation,
  applyExerciseVariation,
  type AIExercise,
} from "@/actions/ai-workout";

// ─── Feature 1: Full Workout ────────────────────────────────────────────────

export function useGenerateWorkoutReplacement() {
  return useMutation({
    mutationFn: (dailyPlanId: number) =>
      generateWorkoutReplacement(dailyPlanId),
  });
}

export function useApplyWorkoutReplacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      exercises,
    }: {
      dailyPlanId: number;
      exercises: AIExercise[];
    }) => applyWorkoutReplacement(dailyPlanId, exercises),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

// ─── Feature 2: Section ─────────────────────────────────────────────────────

export function useGenerateSectionReplacement() {
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      section,
      sectionLabel,
    }: {
      dailyPlanId: number;
      section: string;
      sectionLabel: string;
    }) => generateSectionReplacement(dailyPlanId, section, sectionLabel),
  });
}

export function useApplySectionReplacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      section,
      exercises,
    }: {
      dailyPlanId: number;
      section: string;
      exercises: AIExercise[];
    }) => applySectionReplacement(dailyPlanId, section, exercises),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}

// ─── Feature 3: Single Exercise ─────────────────────────────────────────────

export function useGenerateExerciseVariation() {
  return useMutation({
    mutationFn: ({
      exerciseId,
      dailyPlanId,
    }: {
      exerciseId: number;
      dailyPlanId: number;
    }) => generateExerciseVariation(exerciseId, dailyPlanId),
  });
}

export function useApplyExerciseVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      exerciseId,
      exercise,
    }: {
      exerciseId: number;
      exercise: { name: string; sets: number | null; reps: string | null; restSeconds: number | null; durationMinutes: number | null; notes: string | null };
    }) => applyExerciseVariation(exerciseId, exercise),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
