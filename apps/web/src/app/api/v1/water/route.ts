import type { WaterLogDto } from "@fitmusc/shared/api/dto";
import { limitQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getWaterLogs } from "@/actions/water";

/** Latest logs first (?limit=, default 30). */
export const GET = apiRoute(
  { input: limitQuery },
  ({ input }): Promise<JsonSource<WaterLogDto[]>> => getWaterLogs(input.limit),
);
