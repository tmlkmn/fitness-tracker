import { z } from "zod";
import type { DailyMacroPointDto } from "@fitmusc/shared/api/dto";
import { dateString } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getWeeklyMacroTotals } from "@/actions/meals";

/** Daily macro totals for the 7 days ending at ?endDate=. */
export const GET = apiRoute(
  { input: z.object({ endDate: dateString }) },
  ({ input }): Promise<JsonSource<DailyMacroPointDto[]>> => getWeeklyMacroTotals(input.endDate),
);
