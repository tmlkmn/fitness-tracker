import { useQuery } from "@tanstack/react-query";
import { searchExercises } from "@/actions/exercise-library";

export function useExerciseSearch(query: string) {
  return useQuery({
    queryKey: ["exercise-library", query],
    queryFn: () => searchExercises(query),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 min — static data
  });
}
