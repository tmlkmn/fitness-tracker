import { z } from "zod";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteUserFood } from "@/actions/user-foods";

export const DELETE = apiRoute(
  { params: z.object({ id: idParam }) },
  ({ params }) => deleteUserFood(params.id),
);
