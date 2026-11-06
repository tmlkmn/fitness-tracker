import { aiWorkoutApplySchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { applyWorkoutReplacement } from "@/actions/ai-workout";

/** Replaces all exercises of the day (a rest day always ends up empty). */
export const POST = apiRoute(
  { input: aiWorkoutApplySchema },
  ({ input }) => applyWorkoutReplacement(input.dailyPlanId, input.exercises),
);
