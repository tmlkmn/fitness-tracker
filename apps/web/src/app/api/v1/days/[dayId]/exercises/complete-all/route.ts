import { z } from "zod";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { completeAllExercises } from "@/actions/bulk-completion";

export const POST = apiRoute(
  { params: z.object({ dayId: idParam }) },
  ({ params }) => completeAllExercises(params.dayId),
);
