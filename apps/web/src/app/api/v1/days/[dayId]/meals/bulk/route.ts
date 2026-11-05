import { z } from "zod";
import { bulkMealsSchema, idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { bulkCreateMeals } from "@/actions/meal-crud";

export const POST = apiRoute(
  { params: z.object({ dayId: idParam }), input: bulkMealsSchema },
  ({ params, input }) => bulkCreateMeals(params.dayId, input.items),
);
