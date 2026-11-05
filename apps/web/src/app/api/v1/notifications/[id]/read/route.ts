import { z } from "zod";
import { idParam } from "@fitmusc/shared/api/schemas";
import { apiRoute } from "@/lib/api/handler";
import { markAsRead } from "@/actions/notifications";

export const POST = apiRoute(
  { params: z.object({ id: idParam }) },
  ({ params }) => markAsRead(params.id),
);
