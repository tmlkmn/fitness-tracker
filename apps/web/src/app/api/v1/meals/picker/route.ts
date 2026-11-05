import type { MealPickerDto } from "@fitmusc/shared/api/dto";
import { mealPickerQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getMealPickerData } from "@/actions/meal-picker";

/** Candidates for the meal picker tabs, filtered by ?q=. */
export const GET = apiRoute(
  { input: mealPickerQuery },
  ({ input }): Promise<JsonSource<MealPickerDto>> => getMealPickerData(input.q, input.excludeDayId),
);
