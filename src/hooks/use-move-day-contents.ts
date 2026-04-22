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
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["exercises"] });
      qc.invalidateQueries({ queryKey: ["meals.byDay"] });
      qc.invalidateQueries({ queryKey: ["meals.saved-plans"] });
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
      qc.invalidateQueries({ queryKey: ["dates-with-plans"] });
      qc.invalidateQueries({ queryKey: ["week-plans-date"] });
      qc.invalidateQueries({ queryKey: ["daily-plan"] });
      qc.invalidateQueries({ queryKey: ["daily-plans"] });
      qc.invalidateQueries({ queryKey: ["daily-plans-content"] });

      const parts: string[] = [];
      if (result.movedExerciseCount > 0)
        parts.push(`${result.movedExerciseCount} egzersiz`);
      if (result.movedMealCount > 0)
        parts.push(`${result.movedMealCount} öğün`);

      const summary = parts.length > 0 ? ` (${parts.join(", ")})` : "";
      const action = result.mode === "swap" ? "yer değişti" : "taşındı";

      toast.success(`${result.targetLabel} ile ${action}${summary}`);
    },
    onError: (err) => {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Program taşınamadı, lütfen tekrar deneyin";
      toast.error(msg);
    },
  });
}
