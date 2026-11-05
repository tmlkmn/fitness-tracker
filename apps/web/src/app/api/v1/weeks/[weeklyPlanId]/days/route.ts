import { z } from "zod";
import type { DailyPlanDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getDailyPlansByWeek } from "@/actions/plans";

export const GET = apiRoute(
  { params: z.object({ weeklyPlanId: idParam }) },
  ({ params }): Promise<JsonSource<DailyPlanDto[]>> => getDailyPlansByWeek(params.weeklyPlanId),
);
