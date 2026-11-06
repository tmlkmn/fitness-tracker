import { aiDailyMealsApplySchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { applyDailyMeals } from "@/actions/ai-meals";

/** Replaces all meals of the day — a job result or a saved suggestion. */
export const POST = apiRoute(
  { input: aiDailyMealsApplySchema },
  ({ input }) => applyDailyMeals(input.dailyPlanId, input.meals),
);
