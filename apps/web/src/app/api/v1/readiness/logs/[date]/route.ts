import { z } from "zod";
import type { ReadinessLogDto } from "@fitmusc/shared/api/dto";
import { dateString } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getReadinessLog } from "@/actions/readiness";

/** null when there's no check-in that day. */
export const GET = apiRoute(
  { params: z.object({ date: dateString }) },
  ({ params }): Promise<JsonSource<ReadinessLogDto | null>> => getReadinessLog(params.date),
);
