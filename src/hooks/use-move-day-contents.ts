"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  moveDayContents,
  type MoveDayContentsInput,
} from "@/actions/day-content-move";

export function useMoveDayContents() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: MoveDayContentsInput) => moveDayContents(input),

    onMutate: async ({ sourceDailyPlanId, targetDailyPlanId, mode, includeWorkout, includeMeals }) => {
      // Cancel in-flight queries so they don't overwrite the optimistic state
      if (includeWorkout) {
        await qc.cancelQueries({ queryKey: ["exercises", sourceDailyPlanId] });
        await qc.cancelQueries({ queryKey: ["exercises", targetDailyPlanId] });
      }
      if (includeMeals) {
        await qc.cancelQueries({ queryKey: ["meals.byDay", sourceDailyPlanId] });
        await qc.cancelQueries({ queryKey: ["meals.byDay", targetDailyPlanId] });
      }

      // Snapshot current cache values for rollback
      const prevSourceExercises = includeWorkout
        ? qc.getQueryData<unknown[]>(["exercises", sourceDailyPlanId])
        : undefined;
      const prevTargetExercises = includeWorkout
        ? qc.getQueryData<unknown[]>(["exercises", targetDailyPlanId])
        : undefined;
      const prevSourceMeals = includeMeals
        ? qc.getQueryData<unknown[]>(["meals.byDay", sourceDailyPlanId])
        : undefined;
      const prevTargetMeals = includeMeals
        ? qc.getQueryData<unknown[]>(["meals.byDay", targetDailyPlanId])
        : undefined;

      if (mode === "swap") {
        // Swap: exchange source ↔ target content
        if (includeWorkout) {
          qc.setQueryData(["exercises", sourceDailyPlanId], prevTargetExercises ?? []);
          qc.setQueryData(["exercises", targetDailyPlanId], prevSourceExercises ?? []);
        }
        if (includeMeals) {
          qc.setQueryData(["meals.byDay", sourceDailyPlanId], prevTargetMeals ?? []);
          qc.setQueryData(["meals.byDay", targetDailyPlanId], prevSourceMeals ?? []);
        }
      } else {
        // move / replace: source content moves to target, source becomes empty
        if (includeWorkout) {
          qc.setQueryData(["exercises", sourceDailyPlanId], []);
          qc.setQueryData(["exercises", targetDailyPlanId], prevSourceExercises ?? []);
        }
        if (includeMeals) {
          qc.setQueryData(["meals.byDay", sourceDailyPlanId], []);
          qc.setQueryData(["meals.byDay", targetDailyPlanId], prevSourceMeals ?? []);
        }
      }

      return { prevSourceExercises, prevTargetExercises, prevSourceMeals, prevTargetMeals };
    },

    onSuccess: (result) => {
      const parts: string[] = [];
      if (result.movedExerciseCount > 0)
        parts.push(`${result.movedExerciseCount} egzersiz`);
      if (result.movedMealCount > 0)
        parts.push(`${result.movedMealCount} öğün`);

      const summary = parts.length > 0 ? ` (${parts.join(", ")})` : "";
      const action = result.mode === "swap" ? "yer değişti" : "taşındı";

      toast.success(`${result.targetLabel} ile ${action}${summary}`);
    },

    onError: (err, vars, context) => {
      // Rollback optimistic updates
      if (context?.prevSourceExercises !== undefined)
        qc.setQueryData(["exercises", vars.sourceDailyPlanId], context.prevSourceExercises);
      if (context?.prevTargetExercises !== undefined)
        qc.setQueryData(["exercises", vars.targetDailyPlanId], context.prevTargetExercises);
      if (context?.prevSourceMeals !== undefined)
        qc.setQueryData(["meals.byDay", vars.sourceDailyPlanId], context.prevSourceMeals);
      if (context?.prevTargetMeals !== undefined)
        qc.setQueryData(["meals.byDay", vars.targetDailyPlanId], context.prevTargetMeals);

      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Program taşınamadı, lütfen tekrar deneyin";
      toast.error(msg);
    },

    onSettled: (_data, _err, vars) => {
      // Sync with server after optimistic update resolves
      qc.invalidateQueries({ queryKey: ["exercises", vars.sourceDailyPlanId] });
      qc.invalidateQueries({ queryKey: ["exercises", vars.targetDailyPlanId] });
      qc.invalidateQueries({ queryKey: ["meals.byDay", vars.sourceDailyPlanId] });
      qc.invalidateQueries({ queryKey: ["meals.byDay", vars.targetDailyPlanId] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
      qc.invalidateQueries({ queryKey: ["week-plans-date"] });
      qc.invalidateQueries({ queryKey: ["dates-with-plans"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["meals.saved-plans"] });
    },
  });
}
