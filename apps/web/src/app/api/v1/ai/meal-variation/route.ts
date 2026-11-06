import type { MealVariationResultDto } from "@fitmusc/shared/api/dto";
import { aiMealVariationSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { generateMealVariation } from "@/actions/ai";

export const POST = apiRoute(
  { input: aiMealVariationSchema },
  ({ input }): Promise<JsonSource<MealVariationResultDto>> => generateMealVariation(input),
);
