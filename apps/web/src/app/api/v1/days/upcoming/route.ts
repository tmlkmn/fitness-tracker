import type { UpcomingDayDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getUpcomingDailyPlans } from "@/actions/plans";

export const GET = apiRoute({}, (): Promise<JsonSource<UpcomingDayDto[]>> => getUpcomingDailyPlans());
