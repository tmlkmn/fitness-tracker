import { z } from "zod";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { deleteNotification } from "@/actions/notifications";

export const DELETE = apiRoute(
  { params: z.object({ id: idParam }) },
  ({ params }) => deleteNotification(params.id),
);
