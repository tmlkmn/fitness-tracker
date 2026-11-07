"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  type MoveDayContentsInput,
} from "@/actions/day-content-move";
import { callAction } from "@/lib/safe-action";

// Error code thrown by moveDayContents → its text in workout.moveDialog.errors.
const ERROR_KEY: Record<string, string> = {
  SAME_DAY: "sameDay",
  NOTHING_SELECTED: "nothingSelected",
  DIFFERENT_WEEK: "differentWeek",
  NOT_FOUND: "notFound",
  Unauthorized: "notFound",
};

export function useMoveDayContents() {
  const qc = useQueryClient();
  const t = useTranslations("workout.moveDialog");

  return useMutation({
    mutationFn: (input: MoveDayContentsInput) => callAction("moveDayContents", input),

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
        parts.push(t("toast.exercises", { count: result.movedExerciseCount }));
      if (result.movedMealCount > 0)
        parts.push(t("toast.meals", { count: result.movedMealCount }));

      const summary = parts.length > 0 ? ` (${parts.join(", ")})` : "";
      const values = { target: result.targetLabel, summary };
      toast.success(result.mode === "swap" ? t("toast.swapped", values) : t("toast.moved", values));
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

      const key = err instanceof Error && Object.hasOwn(ERROR_KEY, err.message) ? ERROR_KEY[err.message] : undefined;
      toast.error(t(`errors.${key ?? "generic"}`));
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
