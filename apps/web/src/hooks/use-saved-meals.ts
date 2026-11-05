import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSavedMealSuggestions,
  saveMealSuggestion,
  deleteSavedMealSuggestion,
} from "@/actions/saved-meals";

export function useSavedMealSuggestions(mealLabel?: string) {
  return useQuery({
    queryKey: ["meals.saved", mealLabel ?? "all"],
    queryFn: () => getSavedMealSuggestions(mealLabel),
    staleTime: 60_000,
  });
}

export function useSaveMealSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMealSuggestion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals.saved"] });
    },
  });
}

export function useDeleteSavedMealSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteSavedMealSuggestion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meals.saved"] });
    },
  });
}
