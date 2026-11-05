import type { ActivityStatsDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getActivityStats } from "@/actions/activity-stats";

export const GET = apiRoute({}, (): Promise<JsonSource<ActivityStatsDto>> => getActivityStats());
