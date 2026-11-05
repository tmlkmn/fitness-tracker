import type { ReadinessLogDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getTodayReadinessLog } from "@/actions/readiness";

/** null when there's no check-in today. */
export const GET = apiRoute(
  {},
  (): Promise<JsonSource<ReadinessLogDto | null>> => getTodayReadinessLog(),
);
