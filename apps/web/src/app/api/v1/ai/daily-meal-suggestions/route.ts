import type { IdDto, SavedDailyMealSuggestionDto } from "@fitmusc/shared/api/dto";
import {
  aiDailyMealSuggestionSchema,
  aiDailyMealSuggestionsQuery,
} from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import {
  getSavedDailyMealSuggestions,
  saveDailyMealSuggestion,
} from "@/actions/ai-meals";

export const GET = apiRoute(
  { input: aiDailyMealSuggestionsQuery },
  ({ input }): Promise<JsonSource<SavedDailyMealSuggestionDto>[]> =>
    getSavedDailyMealSuggestions(input.planType),
);

/** Keeps the 10 newest — the oldest is dropped. */
export const POST = apiRoute(
  { input: aiDailyMealSuggestionSchema },
  ({ input }): Promise<JsonSource<IdDto>> =>
    saveDailyMealSuggestion(input.planType, input.meals, input.userNote),
);
