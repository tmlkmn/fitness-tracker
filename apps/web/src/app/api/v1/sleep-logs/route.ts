import type { SleepLogDto } from "@fitmusc/shared/api/dto";
import { limitQuery, sleepLogSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getSleepLogs, upsertSleepLog } from "@/actions/sleep";

/** Latest logs first (?limit=, default 30). */
export const GET = apiRoute(
  { input: limitQuery },
  ({ input }): Promise<JsonSource<SleepLogDto[]>> => getSleepLogs(input.limit),
);

/** Upsert by logDate. */
export const PUT = apiRoute({ input: sleepLogSchema }, ({ input }) => upsertSleepLog(input));
