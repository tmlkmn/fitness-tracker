import { z } from "zod";
import type { SupplementDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getSupplementsByWeek } from "@/actions/plans";

export const GET = apiRoute(
  { params: z.object({ weeklyPlanId: idParam }) },
  ({ params }): Promise<JsonSource<SupplementDto[]>> => getSupplementsByWeek(params.weeklyPlanId),
);
