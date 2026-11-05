import { emptyWeeksBetweenQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { getEmptyWeeksBetween } from "@/actions/plans";

/** Week start dates from ?today= up to ?target= that have no plan yet. */
export const GET = apiRoute(
  { input: emptyWeeksBetweenQuery },
  ({ input }): Promise<string[]> => getEmptyWeeksBetween(input.today, input.target),
);
