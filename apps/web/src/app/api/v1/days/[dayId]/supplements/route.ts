import { z } from "zod";
import type { DailySupplementDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getSupplementsForDailyPlan } from "@/actions/supplement-completion";

/** The week's supplements due on this day, with the day's completion state. */
export const GET = apiRoute(
  { params: z.object({ dayId: idParam }) },
  ({ params }): Promise<JsonSource<DailySupplementDto[]>> => getSupplementsForDailyPlan(params.dayId),
);
