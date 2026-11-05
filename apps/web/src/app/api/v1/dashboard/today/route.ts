import type { TodayDashboardDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getTodayDashboardData } from "@/actions/plans";

export const GET = apiRoute(
  {},
  (): Promise<JsonSource<TodayDashboardDto>> => getTodayDashboardData(),
);
