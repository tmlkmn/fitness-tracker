import type { FrequentMealDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getFrequentRecentMeals } from "@/actions/meal-history";

export const GET = apiRoute({}, (): Promise<JsonSource<FrequentMealDto[]>> => getFrequentRecentMeals());
