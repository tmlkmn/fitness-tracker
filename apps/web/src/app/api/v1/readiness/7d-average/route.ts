import type { Readiness7dAverageDto } from "@fitmusc/shared/api/dto";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getReadiness7dAverage } from "@/actions/readiness";

export const GET = apiRoute(
  {},
  (): Promise<JsonSource<Readiness7dAverageDto>> => getReadiness7dAverage(),
);
