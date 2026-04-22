import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  generateWorkoutReplacement,
  applyWorkoutReplacement,
  generateSectionReplacement,
  applySectionReplacement,
  generateExerciseVariation,
  applyExerciseVariation,
  type AIExercise,
  type AIExerciseVariation,
} from "@/actions/ai-workout";

// ─── Feature 1: Full Workout ────────────────────────────────────────────────

export function useGenerateWorkoutReplacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dailyPlanId, userNote }: { dailyPlanId: number; userNote?: string }) =>
      generateWorkoutReplacement(dailyPlanId, userNote),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["ai.quota"] });
    },
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
      qc.refetchQueries({ queryKey: ["exercises"] });
      qc.refetchQueries({ queryKey: ["today-dashboard"] });
    },
  });
}

// ─── Feature 2: Section ─────────────────────────────────────────────────────

export function useGenerateSectionReplacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      section,
      sectionLabel,
      userNote,
    }: {
      dailyPlanId: number;
      section: string;
      sectionLabel: string;
      userNote?: string;
    }) => generateSectionReplacement(dailyPlanId, section, sectionLabel, userNote),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["ai.quota"] });
    },
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
      qc.refetchQueries({ queryKey: ["exercises"] });
      qc.refetchQueries({ queryKey: ["today-dashboard"] });
    },
  });
}

// ─── Feature 3: Single Exercise ─────────────────────────────────────────────

export function useGenerateExerciseVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      exerciseId,
      dailyPlanId,
      userNote,
      forceRefresh,
    }: {
      exerciseId: number;
      dailyPlanId: number;
      userNote?: string;
      forceRefresh?: boolean;
    }) => generateExerciseVariation(exerciseId, dailyPlanId, userNote, forceRefresh),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["ai.quota"] });
    },
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
      exercise: AIExerciseVariation;
    }) => applyExerciseVariation(exerciseId, exercise),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["exercises"] });
      qc.refetchQueries({ queryKey: ["today-dashboard"] });
    },
  });
}
