import type { ProgressLogDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getLatestProgressLog } from "@/actions/progress";

/** null when nothing is logged yet. */
export const GET = apiRoute(
  {},
  async (): Promise<JsonSource<ProgressLogDto | null>> => (await getLatestProgressLog()) ?? null,
);
