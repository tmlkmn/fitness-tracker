import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateDailyMeals,
  applyDailyMeals,
  saveDailyMealSuggestion,
  getSavedDailyMealSuggestions,
  deleteSavedDailyMealSuggestion,
  type AIMeal,
} from "@/actions/ai-meals";

export function useGenerateDailyMeals() {
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      userNote,
    }: {
      dailyPlanId: number;
      userNote?: string;
    }) => generateDailyMeals(dailyPlanId, userNote),
  });
}

export function useApplyDailyMeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      dailyPlanId,
      newMeals,
    }: {
      dailyPlanId: number;
      newMeals: AIMeal[];
    }) => applyDailyMeals(dailyPlanId, newMeals),
    onSuccess: () => {
      qc.refetchQueries({ queryKey: ["meals"] });
      qc.refetchQueries({ queryKey: ["today-dashboard"] });
    },
  });
}

export function useSavedDailyMealSuggestions(planType?: string) {
  return useQuery({
    queryKey: ["savedDailyMealSuggestions", planType ?? "all"],
    queryFn: () => getSavedDailyMealSuggestions(planType),
    staleTime: 60_000,
  });
}

export function useSaveDailyMealSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      planType,
      meals,
      userNote,
    }: {
      planType: string;
      meals: AIMeal[];
      userNote?: string;
    }) => saveDailyMealSuggestion(planType, meals, userNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savedDailyMealSuggestions"] });
    },
  });
}

export function useDeleteDailyMealSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteSavedDailyMealSuggestion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["savedDailyMealSuggestions"] });
    },
  });
}
