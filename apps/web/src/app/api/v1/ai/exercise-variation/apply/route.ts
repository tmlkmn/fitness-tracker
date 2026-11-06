import { aiExerciseVariationApplySchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { applyExerciseVariation } from "@/actions/ai-workout";

/** Replaces the exercise with one of its alternatives (completion is reset). */
export const POST = apiRoute(
  { input: aiExerciseVariationApplySchema },
  ({ input }) => applyExerciseVariation(input.exerciseId, input.exercise),
);
