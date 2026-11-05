import { z } from "zod";
import type { DailyPlanDto } from "@fitmusc/shared/api/dto";
import { dateString } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getDailyPlanByDate } from "@/actions/plans";

/** null when the date has no plan. */
export const GET = apiRoute(
  { params: z.object({ date: dateString }) },
  async ({ params }): Promise<JsonSource<DailyPlanDto | null>> =>
    (await getDailyPlanByDate(params.date)) ?? null,
);
