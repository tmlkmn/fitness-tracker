import { z } from "zod";
import { dateString, waterIncrementSchema } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { incrementWater } from "@/actions/water";

/** Adds delta glasses (negative to undo); the count never goes below 0. */
export const POST = apiRoute(
  { params: z.object({ date: dateString }), input: waterIncrementSchema },
  ({ params, input }) => incrementWater(params.date, input.delta),
);
