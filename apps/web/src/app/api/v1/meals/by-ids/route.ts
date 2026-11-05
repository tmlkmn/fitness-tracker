import type { MealRefDto } from "@fitmusc/shared/api/dto";
import { mealIdsQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getMealsByIds } from "@/actions/shopping";

/** ?ids=1,2,3 — resolves a shopping item's mealIds (own meals only). */
export const GET = apiRoute(
  { input: mealIdsQuery },
  ({ input }): Promise<JsonSource<MealRefDto[]>> => getMealsByIds(input.ids),
);
