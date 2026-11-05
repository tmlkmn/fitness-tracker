import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { idParam, mealInputSchema } from "@/lib/api/schemas";
import { updateMeal } from "@/actions/meal-crud";

// PUT, not PATCH: updateMeal overwrites every field (omitted optionals → null).
export const PUT = apiRoute(
  { params: z.object({ mealId: idParam }), input: mealInputSchema },
  ({ params, input }) => updateMeal(params.mealId, input),
);
