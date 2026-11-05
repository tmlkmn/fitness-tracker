import { z } from "zod";
import type { DailyPlanDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, orNotFound, type JsonSource } from "@/lib/api/handler";
import { getDailyPlan } from "@/actions/plans";

export const GET = apiRoute(
  { params: z.object({ dayId: idParam }) },
  async ({ params }): Promise<JsonSource<DailyPlanDto>> => orNotFound(await getDailyPlan(params.dayId)),
);
