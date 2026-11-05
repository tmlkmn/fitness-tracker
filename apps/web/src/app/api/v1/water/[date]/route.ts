import { z } from "zod";
import type { WaterLogDto } from "@fitmusc/shared/api/dto";
import { dateString } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getWaterLog } from "@/actions/water";

/** null when nothing is logged that day. */
export const GET = apiRoute(
  { params: z.object({ date: dateString }) },
  async ({ params }): Promise<JsonSource<WaterLogDto | null>> =>
    (await getWaterLog(params.date)) ?? null,
);
