import { z } from "zod";
import type { ExerciseDto, IdDto } from "@fitmusc/shared/api/dto";
import { exerciseInputSchema, idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute, type JsonSource } from "@/lib/api/handler";
import { getExercisesByDay } from "@/actions/exercises";
import { createExercise, deleteAllExercises } from "@/actions/exercise-crud";

const params = z.object({ dayId: idParam });

export const GET = apiRoute(
  { params },
  ({ params }): Promise<JsonSource<ExerciseDto[]>> => getExercisesByDay(params.dayId),
);

export const POST = apiRoute(
  { params, input: exerciseInputSchema },
  ({ params, input }): Promise<IdDto> => createExercise(params.dayId, input),
);

export const DELETE = apiRoute({ params }, ({ params }) => deleteAllExercises(params.dayId));
