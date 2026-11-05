import type { WaterLogDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getTodayWaterLog } from "@/actions/water";

/** null until the first glass today. */
export const GET = apiRoute(
  {},
  async (): Promise<JsonSource<WaterLogDto | null>> => (await getTodayWaterLog()) ?? null,
);
