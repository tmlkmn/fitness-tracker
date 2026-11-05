import { z } from "zod";
import type { MealDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getMealsByDay } from "@/actions/meals";

export const GET = apiRoute(
  { params: z.object({ dayId: idParam }) },
  ({ params }): Promise<JsonSource<MealDto[]>> => getMealsByDay(params.dayId),
);
