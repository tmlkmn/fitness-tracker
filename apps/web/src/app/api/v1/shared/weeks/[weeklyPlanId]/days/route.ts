import { z } from "zod";
import type { DailyPlanDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getSharedDailyPlansByWeek } from "@/actions/shared-plans";

export const GET = apiRoute(
  { params: z.object({ weeklyPlanId: idParam }) },
  ({ params }): Promise<JsonSource<DailyPlanDto[]>> => getSharedDailyPlansByWeek(params.weeklyPlanId),
);
