import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyWeeklyPlan,
  deleteWeeklyPlan as deleteWeeklyPlanAction,
  type AIWeeklyPlan,
} from "@/actions/ai-weekly";
import type { DayModeChoice } from "@/lib/ai-weekly-types";
import {
  getSavedSuggestions,
  getSavedSuggestionById,
  deleteSavedSuggestion as deleteSavedSuggestionAction,
} from "@/actions/ai-suggestions";

export function useGenerateWeeklyPlan() {
  return useMutation({
    mutationFn: async ({
      dateStr,
      userNote,
      generateMode,
      dayModes,
    }: {
      dateStr: string;
      userNote?: string;
      generateMode?: "both" | "nutrition" | "workout";
      dayModes?: Partial<Record<number, DayModeChoice>>;
    }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      try {
        const res = await fetch("/api/ai/weekly", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dateStr, userNote, generateMode, dayModes }),
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error ?? "Bir hata oluştu.");
        }

        return data.suggestedPlan as AIWeeklyPlan;
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}

export function useApplyWeeklyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dateStr,
      plan,
      applyMode,
    }: {
      dateStr: string;
      plan: AIWeeklyPlan;
      applyMode?: "both" | "nutrition" | "workout";
    }) => applyWeeklyPlan(dateStr, plan, applyMode),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["plans"] });
      qc.refetchQueries({ queryKey: ["meals.byDay"] });
      qc.refetchQueries({ queryKey: ["exercises"] });
      qc.refetchQueries({ queryKey: ["today-dashboard"] });
      qc.refetchQueries({ queryKey: ["week-plans-date"] });
    },
  });
}

export function useDeleteWeeklyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weeklyPlanId: number) => deleteWeeklyPlanAction(weeklyPlanId),
    onMutate: async () => {
      // Cancel outgoing queries so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ["week-plans-date"] });
      await qc.cancelQueries({ queryKey: ["today-dashboard"] });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans"] });
      qc.invalidateQueries({ queryKey: ["weeks"] });
      qc.invalidateQueries({ queryKey: ["week-plans-date"] });
      qc.invalidateQueries({ queryKey: ["today-dashboard"] });
      qc.invalidateQueries({ queryKey: ["dates-with-plans"] });
    },
  });
}

// ─── Saved AI Suggestions ──────────────────────────────────────────────────

export function useSavedSuggestions(enabled: boolean) {
  return useQuery({
    queryKey: ["ai-suggestions"],
    queryFn: () => getSavedSuggestions(),
    enabled,
    staleTime: 60_000,
  });
}

export function useSavedSuggestionDetail(id: number | null) {
  return useQuery({
    queryKey: ["ai-suggestion", id],
    queryFn: () => getSavedSuggestionById(id!),
    enabled: id !== null,
  });
}

export function useDeleteSavedSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSavedSuggestionAction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-suggestions"] });
    },
  });
}
