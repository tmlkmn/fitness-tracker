import type { RecentMealDto } from "@fitmusc/shared/api/dto";
import { recentMealsQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getRecentMealsByLabel } from "@/actions/meal-history";

/** Recent meals with ?label=, excluding the day being edited (?excludeDayId=). */
export const GET = apiRoute(
  { input: recentMealsQuery },
  ({ input }): Promise<JsonSource<RecentMealDto[]>> =>
    getRecentMealsByLabel(input.label, input.excludeDayId),
);
