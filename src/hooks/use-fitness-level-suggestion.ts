import { useQuery } from "@tanstack/react-query";
import { getFitnessLevelSuggestion } from "@/actions/fitness-level";

export const FITNESS_LEVEL_SUGGESTION_KEY = ["user.fitness-level-suggestion"] as const;

export function useFitnessLevelSuggestion() {
  return useQuery({
    queryKey: FITNESS_LEVEL_SUGGESTION_KEY,
    queryFn: () => getFitnessLevelSuggestion(),
    // Signals derive from weekly plans + completion — slow to change. One hour
    // stale time keeps the nudge stable across a single editing session.
    staleTime: 60 * 60 * 1000,
  });
}
