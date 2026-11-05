import { z } from "zod";
import type { WaterTargetDto } from "@fitmusc/shared/api/dto";
import { dateString } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { getDailyWaterTarget } from "@/actions/water";

export const GET = apiRoute(
  { params: z.object({ date: dateString }) },
  async ({ params }): Promise<WaterTargetDto> => ({
    targetGlasses: await getDailyWaterTarget(params.date),
  }),
);
