import { z } from "zod";
import type { WeeklyPlanDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, orNotFound, type JsonSource } from "@/lib/api/handler";
import { getWeeklyPlan } from "@/actions/plans";

export const GET = apiRoute(
  { params: z.object({ weekNumber: idParam }) },
  async ({ params }): Promise<JsonSource<WeeklyPlanDto>> =>
    orNotFound(await getWeeklyPlan(params.weekNumber)),
);
