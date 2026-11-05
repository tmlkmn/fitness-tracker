import { z } from "zod";
import type { SharedDailyPlanDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, orNotFound, type JsonSource } from "@/lib/api/handler";
import { getSharedDailyPlan } from "@/actions/shared-plans";

export const GET = apiRoute(
  { params: z.object({ dayId: idParam }) },
  async ({ params }): Promise<JsonSource<SharedDailyPlanDto>> =>
    orNotFound(await getSharedDailyPlan(params.dayId)),
);
