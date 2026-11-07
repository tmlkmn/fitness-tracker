import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  applyWorkoutReplacement,
  applySectionReplacement,
  applyExerciseVariation,
  type AIExercise,
  type AIExerciseVariation,
} from "@/actions/ai-workout";
import { invalidateWorkoutQueries } from "@/hooks/ai-invalidation";
import { callAction } from "@/lib/safe-action";

// ─── Feature 1: Full Workout ────────────────────────────────────────────────

export function useGenerateWorkoutReplacement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dailyPlanId, userNote }: { dailyPlanId: number; userNote?: string }) =>
      callAction("generateWorkoutReplacement", dailyPlanId, userNote),
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
      invalidateWorkoutQueries(qc);
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
    }) => callAction("generateSectionReplacement", dailyPlanId, section, sectionLabel, userNote),
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
      invalidateWorkoutQueries(qc);
    },
  });
}

// ─── Feature 3: Single Exercise ─────────────────────────────────────────────

export function useGenerateExerciseVariation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      exerciseId,
      userNote,
      forceRefresh,
    }: {
      exerciseId: number;
      userNote?: string;
      forceRefresh?: boolean;
    }) => callAction("generateExerciseVariation", exerciseId, userNote, forceRefresh),
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
      invalidateWorkoutQueries(qc);
    },
  });
}
