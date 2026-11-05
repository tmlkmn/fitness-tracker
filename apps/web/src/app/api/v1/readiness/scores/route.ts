import type { ReadinessDayScoreDto } from "@fitmusc/shared/api/dto";
import { dateRangeQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getReadinessByDateRange } from "@/actions/readiness";

/** Daily scores for ?start=&end= (at most a year). */
export const GET = apiRoute(
  { input: dateRangeQuery },
  ({ input }): Promise<JsonSource<ReadinessDayScoreDto[]>> =>
    getReadinessByDateRange(input.start, input.end),
);
