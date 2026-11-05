import { z } from "zod";
import type { SharedWeeklyPlanDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, orNotFound, type JsonSource } from "@/lib/api/handler";
import { getSharedWeeklyPlan } from "@/actions/shared-plans";

export const GET = apiRoute(
  { params: z.object({ weeklyPlanId: idParam }) },
  async ({ params }): Promise<JsonSource<SharedWeeklyPlanDto>> =>
    orNotFound(await getSharedWeeklyPlan(params.weeklyPlanId)),
);
