import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateWeeklyPlan,
  applyWeeklyPlan,
  deleteWeeklyPlan as deleteWeeklyPlanAction,
  type AIWeeklyPlan,
} from "@/actions/ai-weekly";
import {
  getSavedSuggestions,
  getSavedSuggestionById,
  deleteSavedSuggestion as deleteSavedSuggestionAction,
} from "@/actions/ai-suggestions";

export function useGenerateWeeklyPlan() {
  return useMutation({
    mutationFn: ({ dateStr, userNote, generateMode }: { dateStr: string; userNote?: string; generateMode?: "both" | "nutrition" | "workout" }) =>
      generateWeeklyPlan(dateStr, userNote, generateMode),
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
      qc.refetchQueries({ queryKey: ["meals"] });
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
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["plans"] });
      qc.refetchQueries({ queryKey: ["week-plans-date"] });
      qc.refetchQueries({ queryKey: ["today-dashboard"] });
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
