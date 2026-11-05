import type { ReadinessDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { computeTodayReadiness } from "@/actions/readiness";

export const GET = apiRoute({}, (): Promise<JsonSource<ReadinessDto>> => computeTodayReadiness());
