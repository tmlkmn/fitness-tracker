import { monthQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { getEmptyWeeksInMonth } from "@/actions/plans";

/** Week start dates in ?year=&month= that have no plan yet. */
export const GET = apiRoute(
  { input: monthQuery },
  ({ input }): Promise<string[]> => getEmptyWeeksInMonth(input.year, input.month),
);
