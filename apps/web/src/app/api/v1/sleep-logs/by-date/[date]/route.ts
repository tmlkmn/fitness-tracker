import { z } from "zod";
import type { SleepLogDto } from "@fitmusc/shared/api/dto";
import { dateString } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getSleepLogByDate } from "@/actions/sleep";

/** null when nothing is logged that day. */
export const GET = apiRoute(
  { params: z.object({ date: dateString }) },
  async ({ params }): Promise<JsonSource<SleepLogDto | null>> =>
    (await getSleepLogByDate(params.date)) ?? null,
);
