import { z } from "zod";
import { idParam, mealInputSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteMeal, updateMeal } from "@/actions/meal-crud";

const params = z.object({ mealId: idParam });

// PUT, not PATCH: updateMeal overwrites every field (omitted optionals → null).
export const PUT = apiRoute(
  { params, input: mealInputSchema },
  ({ params, input }) => updateMeal(params.mealId, input),
);

export const DELETE = apiRoute({ params }, ({ params }) => deleteMeal(params.mealId));
