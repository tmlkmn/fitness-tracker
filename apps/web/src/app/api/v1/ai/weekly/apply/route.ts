import { aiWeeklyApplySchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { applyWeeklyPlan } from "@/actions/ai-weekly";

/**
 * Writes a generated week (job result or saved suggestion) into the calendar.
 * `pastDows` days are never touched; `applyMode` limits it to meals or workouts.
 */
export const POST = apiRoute(
  { input: aiWeeklyApplySchema },
  ({ input }) => applyWeeklyPlan(input.dateStr, input.plan, input.applyMode, input.pastDows),
);
