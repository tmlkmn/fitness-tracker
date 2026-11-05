import { z } from "zod";
import { exerciseInputSchema, idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteExercise, updateExercise } from "@/actions/exercise-crud";

const params = z.object({ exerciseId: idParam });

// PUT, not PATCH: updateExercise overwrites every field (omitted optionals → null).
export const PUT = apiRoute(
  { params, input: exerciseInputSchema },
  ({ params, input }) => updateExercise(params.exerciseId, input),
);

export const DELETE = apiRoute({ params }, ({ params }) => deleteExercise(params.exerciseId));
