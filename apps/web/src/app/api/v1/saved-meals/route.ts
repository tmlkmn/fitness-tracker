import type { SavedMealDto } from "@fitmusc/shared/api/dto";
import { savedMealSchema, savedMealsQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getSavedMealSuggestions, saveMealSuggestion } from "@/actions/saved-meals";

export const GET = apiRoute(
  { input: savedMealsQuery },
  ({ input }): Promise<JsonSource<SavedMealDto[]>> => getSavedMealSuggestions(input.label),
);

export const POST = apiRoute({ input: savedMealSchema }, ({ input }) => saveMealSuggestion(input));
