import { aiWorkoutSectionApplySchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { applySectionReplacement } from "@/actions/ai-workout";

/** Replaces one section of the day's workout. */
export const POST = apiRoute(
  { input: aiWorkoutSectionApplySchema },
  ({ input }) => applySectionReplacement(input.dailyPlanId, input.section, input.exercises),
);
