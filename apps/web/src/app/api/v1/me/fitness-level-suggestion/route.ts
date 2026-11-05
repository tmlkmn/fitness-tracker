import type { FitnessLevelSuggestionDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getFitnessLevelSuggestion } from "@/actions/fitness-level";

/** null when there's nothing to suggest. */
export const GET = apiRoute(
  {},
  (): Promise<JsonSource<FitnessLevelSuggestionDto | null>> => getFitnessLevelSuggestion(),
);
