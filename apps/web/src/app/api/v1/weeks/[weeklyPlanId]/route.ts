import { z } from "zod";
import type { WeeklyPlanDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, orNotFound, type JsonSource } from "@/lib/api/handler";
import { getWeeklyPlanById } from "@/actions/plans";
import { deleteWeeklyPlan } from "@/actions/ai-weekly";

const params = z.object({ weeklyPlanId: idParam });

export const GET = apiRoute(
  { params },
  async ({ params }): Promise<JsonSource<WeeklyPlanDto>> =>
    orNotFound(await getWeeklyPlanById(params.weeklyPlanId)),
);

/** Deletes the week with its days, meals, exercises, supplements and shopping list. */
export const DELETE = apiRoute({ params }, ({ params }) => deleteWeeklyPlan(params.weeklyPlanId));
