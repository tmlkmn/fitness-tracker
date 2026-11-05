import { z } from "zod";
import { routineSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { updateDailyRoutine, updateWeekendRoutine } from "@/actions/user";

/** Replaces the weekday or weekend routine. */
export const PUT = apiRoute(
  { params: z.object({ kind: z.enum(["weekday", "weekend"]) }), input: routineSchema },
  ({ params, input }) =>
    params.kind === "weekday" ? updateDailyRoutine(input.items) : updateWeekendRoutine(input.items),
);
