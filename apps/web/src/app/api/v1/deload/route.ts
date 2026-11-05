import type { DeloadRecommendationDto } from "@fitmusc/shared/api/dto";
import { dateQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getDeloadRecommendation } from "@/actions/deload";

export const GET = apiRoute(
  { input: dateQuery },
  ({ input }): Promise<JsonSource<DeloadRecommendationDto>> => getDeloadRecommendation(input.date),
);
