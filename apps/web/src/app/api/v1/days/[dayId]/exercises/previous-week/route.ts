import { z } from "zod";
import type { PreviousExerciseDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getExercisesFromPreviousWeek } from "@/actions/exercise-history";

/** Same weekday's exercises from the previous week — for "copy last week". */
export const GET = apiRoute(
  { params: z.object({ dayId: idParam }) },
  ({ params }): Promise<JsonSource<PreviousExerciseDto[]>> =>
    getExercisesFromPreviousWeek(params.dayId),
);
