import type { CalendarDayDto } from "@fitmusc/shared/api/dto";
import { monthQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getDatesWithPlansForMonth } from "@/actions/plans";

/** Days with a plan in ?year=&month= (month 1-12). */
export const GET = apiRoute(
  { input: monthQuery },
  ({ input }): Promise<JsonSource<CalendarDayDto[]>> =>
    getDatesWithPlansForMonth(input.year, input.month),
);
