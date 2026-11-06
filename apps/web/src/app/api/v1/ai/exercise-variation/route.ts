import type { ExerciseVariationResultDto } from "@fitmusc/shared/api/dto";
import { aiExerciseVariationRequestSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { generateExerciseVariation } from "@/actions/ai-workout";

// Smart model with a retry (30s budget each).
export const maxDuration = 120;

export const POST = apiRoute(
  { input: aiExerciseVariationRequestSchema },
  ({ input }): Promise<JsonSource<ExerciseVariationResultDto>> =>
    generateExerciseVariation(input.exerciseId, input.userNote, input.forceRefresh),
);
