import type { WeeklyPlanDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getAllWeeks } from "@/actions/plans";

export const GET = apiRoute({}, (): Promise<JsonSource<WeeklyPlanDto[]>> => getAllWeeks());
