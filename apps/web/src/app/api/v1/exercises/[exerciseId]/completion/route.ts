import { z } from "zod";
import { completionSchema, idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { toggleExerciseCompleted } from "@/actions/exercises";

export const PUT = apiRoute(
  { params: z.object({ exerciseId: idParam }), input: completionSchema },
  ({ params, input }) => toggleExerciseCompleted(params.exerciseId, input.isCompleted),
);
