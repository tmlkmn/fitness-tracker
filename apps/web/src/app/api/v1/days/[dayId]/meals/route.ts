import { z } from "zod";
import type { IdDto, MealDto } from "@fitmusc/shared/api/dto";
import { idParam, mealInputSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getMealsByDay } from "@/actions/meals";
import { createMeal, deleteAllMeals } from "@/actions/meal-crud";

const params = z.object({ dayId: idParam });

export const GET = apiRoute(
  { params },
  ({ params }): Promise<JsonSource<MealDto[]>> => getMealsByDay(params.dayId),
);

export const POST = apiRoute(
  { params, input: mealInputSchema },
  ({ params, input }): Promise<IdDto> => createMeal(params.dayId, input),
);

export const DELETE = apiRoute({ params }, ({ params }) => deleteAllMeals(params.dayId));
