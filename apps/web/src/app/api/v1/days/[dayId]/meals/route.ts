import { z } from "zod";
import { apiRoute } from "@/lib/api/handler";
import { idParam } from "@/lib/api/schemas";
import { getMealsByDay } from "@/actions/meals";

export const GET = apiRoute(
  { params: z.object({ dayId: idParam }) },
  ({ params }) => getMealsByDay(params.dayId),
);
