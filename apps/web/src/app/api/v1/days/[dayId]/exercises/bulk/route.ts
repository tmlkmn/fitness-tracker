import { z } from "zod";
import { bulkExercisesSchema, idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { bulkCreateExercises } from "@/actions/exercise-crud";

export const POST = apiRoute(
  { params: z.object({ dayId: idParam }), input: bulkExercisesSchema },
  ({ params, input }) => bulkCreateExercises(params.dayId, input.items),
);
