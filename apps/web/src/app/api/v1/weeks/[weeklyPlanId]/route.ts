import { z } from "zod";
import type { WeeklyPlanDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, orNotFound, type JsonSource } from "@/lib/api/handler";
import { getWeeklyPlanById } from "@/actions/plans";

export const GET = apiRoute(
  { params: z.object({ weeklyPlanId: idParam }) },
  async ({ params }): Promise<JsonSource<WeeklyPlanDto>> =>
    orNotFound(await getWeeklyPlanById(params.weeklyPlanId)),
);
