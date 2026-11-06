import type { SavedWeeklySuggestionDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getSavedSuggestions } from "@/actions/ai-suggestions";

/** Every weekly generation is saved here (max 20); past weeks are left out. */
export const GET = apiRoute(
  {},
  (): Promise<JsonSource<SavedWeeklySuggestionDto>[]> => getSavedSuggestions(),
);
