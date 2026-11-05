import type { ExerciseDemoDto } from "@fitmusc/shared/api/dto";
import { exerciseDemoQuery } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getExerciseDemo } from "@/actions/exercise-demo";

/** Cached demo for ?name=; a cache miss calls the AI (rate-limited, may 429). */
export const GET = apiRoute(
  { input: exerciseDemoQuery },
  ({ input }): Promise<JsonSource<ExerciseDemoDto>> => getExerciseDemo(input.name),
);
