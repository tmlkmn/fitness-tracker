import { z } from "zod";
import type { DailyPlanSummaryDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getDailyPlansWithContentCounts } from "@/actions/plans";

export const GET = apiRoute(
  { params: z.object({ weeklyPlanId: idParam }) },
  ({ params }): Promise<JsonSource<DailyPlanSummaryDto[]>> =>
    getDailyPlansWithContentCounts(params.weeklyPlanId),
);
