import type { SleepLogDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getLatestSleepLog } from "@/actions/sleep";

/** null when nothing is logged yet. */
export const GET = apiRoute(
  {},
  async (): Promise<JsonSource<SleepLogDto | null>> => (await getLatestSleepLog()) ?? null,
);
