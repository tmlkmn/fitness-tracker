import { z } from "zod";
import type { ExerciseDto } from "@fitmusc/shared/api/dto";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getSharedExercisesByDay } from "@/actions/shared-plans";

export const GET = apiRoute(
  { params: z.object({ dayId: idParam }) },
  ({ params }): Promise<JsonSource<ExerciseDto[]>> => getSharedExercisesByDay(params.dayId),
);
