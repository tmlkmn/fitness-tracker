import { z } from "zod";
import { completionSchema, idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { toggleMealCompleted } from "@/actions/meals";

export const PUT = apiRoute(
  { params: z.object({ mealId: idParam }), input: completionSchema },
  ({ params, input }) => toggleMealCompleted(params.mealId, input.isCompleted),
);
