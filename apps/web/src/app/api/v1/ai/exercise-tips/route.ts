import type { ExerciseTipsDto } from "@fitmusc/shared/api/dto";
import { aiExerciseTipsSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getExerciseFormTips, regenerateExerciseFormTips } from "@/actions/ai";

export const POST = apiRoute(
  { input: aiExerciseTipsSchema },
  ({ input }): Promise<JsonSource<ExerciseTipsDto>> => {
    const generate = input.regenerate ? regenerateExerciseFormTips : getExerciseFormTips;
    return generate(input.exerciseName, input.exerciseNotes, input.englishName ?? null);
  },
);
