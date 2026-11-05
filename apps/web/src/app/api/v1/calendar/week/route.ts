import type { CalendarWeekDto } from "@fitmusc/shared/api/dto";
import { dateQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getDailyPlansForWeekByDate } from "@/actions/plans";

/** The week containing ?date=, with its days. */
export const GET = apiRoute(
  { input: dateQuery },
  ({ input }): Promise<JsonSource<CalendarWeekDto>> => getDailyPlansForWeekByDate(input.date),
);
